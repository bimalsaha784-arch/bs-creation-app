import type { Handler } from "@netlify/functions";
import { supabaseAdmin, getAuthedUser, json } from "./utils/supabaseAdmin";
import { createRazorpayOrder } from "./utils/razorpay";

/**
 * POST /api/create-order
 * Body: { courseId: string }
 *
 * Security-critical: the browser sends ONLY a course id, never a price or amount.
 * The price is always re-read from the database here.
 */
export const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });

  const user = await getAuthedUser(event.headers.authorization);
  if (!user) return json(401, { error: "Not authenticated" });

  let courseId: string | undefined;
  try {
    const body = JSON.parse(event.body || "{}");
    courseId = body.courseId;
  } catch {
    return json(400, { error: "Invalid request body" });
  }
  if (!courseId) return json(400, { error: "courseId is required" });

  // 1. Load the REAL course + price from the database. Never trust anything from the client here.
  const { data: course, error: courseErr } = await supabaseAdmin
    .from("courses")
    .select("id, title, price, discount_price, currency, status")
    .eq("id", courseId)
    .single();

  if (courseErr || !course) return json(404, { error: "Course not found" });
  if (course.status !== "published") return json(403, { error: "Course is not available for purchase" });

  // 2. Already enrolled? Don't allow buying again.
  const { data: existingEnrollment } = await supabaseAdmin
    .from("enrollments")
    .select("id")
    .eq("user_id", user.id)
    .eq("course_id", courseId)
    .eq("status", "active")
    .maybeSingle();
  if (existingEnrollment) return json(409, { error: "You already own this course" });

  // 3. Reuse an existing pending/created order for this user+course if one exists (idempotency,
  //    avoids duplicate Razorpay orders on double-click / retry).
  const { data: existingOrder } = await supabaseAdmin
    .from("orders")
    .select("*")
    .eq("user_id", user.id)
    .eq("course_id", courseId)
    .in("status", ["created", "pending"])
    .maybeSingle();

  const effectivePrice = course.discount_price ?? course.price;
  const amountInPaise = Math.round(Number(effectivePrice) * 100);

  let orderRow = existingOrder;

  if (!orderRow) {
    const { data: inserted, error: insertErr } = await supabaseAdmin
      .from("orders")
      .insert({
        user_id: user.id,
        course_id: courseId,
        amount: effectivePrice,
        currency: course.currency,
        status: "created",
      })
      .select()
      .single();
    if (insertErr || !inserted) return json(500, { error: "Could not create order" });
    orderRow = inserted;
  }

  // 4. Create (or reuse) the Razorpay order.
  let razorpayOrderId = orderRow.razorpay_order_id as string | null;
  if (!razorpayOrderId) {
    const rzpOrder = await createRazorpayOrder({
      amountInPaise,
      currency: course.currency,
      receipt: orderRow.id,
      notes: { course_id: courseId, user_id: user.id },
    });
    razorpayOrderId = rzpOrder.id;

    await supabaseAdmin
      .from("orders")
      .update({ razorpay_order_id: razorpayOrderId, status: "pending" })
      .eq("id", orderRow.id);
  }

  return json(200, {
    orderId: orderRow.id,
    razorpayOrderId,
    amount: amountInPaise,
    currency: course.currency,
    courseTitle: course.title,
  });
};
