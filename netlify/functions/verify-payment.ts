import type { Handler } from "@netlify/functions";
import { supabaseAdmin, getAuthedUser, json } from "./utils/supabaseAdmin";
import { verifyCheckoutSignature } from "./utils/razorpay";

/**
 * POST /api/verify-payment
 * Body: { razorpay_order_id, razorpay_payment_id, razorpay_signature }
 *
 * Called by the frontend from Razorpay Checkout's success handler.
 * This is a *convenience* fast-path for unlocking the UI quickly — the webhook
 * (razorpay-webhook.ts) is the source of truth and will also verify + enroll,
 * idempotently, in case this call never happens (browser closed, network drop).
 */
export const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });

  const user = await getAuthedUser(event.headers.authorization);
  if (!user) return json(401, { error: "Not authenticated" });

  let payload: { razorpay_order_id?: string; razorpay_payment_id?: string; razorpay_signature?: string };
  try {
    payload = JSON.parse(event.body || "{}");
  } catch {
    return json(400, { error: "Invalid request body" });
  }

  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = payload;
  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return json(400, { error: "Missing Razorpay fields" });
  }

  // 1. Signature must be valid before we trust anything else in the payload.
  const validSignature = verifyCheckoutSignature({
    orderId: razorpay_order_id,
    paymentId: razorpay_payment_id,
    signature: razorpay_signature,
  });
  if (!validSignature) return json(400, { error: "Invalid payment signature" });

  // 2. The order MUST already exist in our database, belong to this user, and its
  //    amount is whatever WE stored when we created it — never anything from the client.
  const { data: order, error: orderErr } = await supabaseAdmin
    .from("orders")
    .select("*")
    .eq("razorpay_order_id", razorpay_order_id)
    .eq("user_id", user.id)
    .single();

  if (orderErr || !order) return json(404, { error: "Order not found for this user" });

  const result = await activateOrder({
    order,
    razorpayPaymentId: razorpay_payment_id,
    razorpaySignature: razorpay_signature,
  });

  return json(200, result);
};

/**
 * Shared, idempotent activation logic used by both verify-payment and the webhook.
 * Safe to call multiple times for the same payment.
 */
export async function activateOrder(args: {
  order: any;
  razorpayPaymentId: string;
  razorpaySignature?: string;
}) {
  const { order, razorpayPaymentId, razorpaySignature } = args;

  // Idempotency: if we already recorded this exact payment as captured, don't redo work.
  const { data: existingPayment } = await supabaseAdmin
    .from("payments")
    .select("*")
    .eq("razorpay_payment_id", razorpayPaymentId)
    .maybeSingle();

  if (existingPayment?.status === "captured") {
    return { status: "already_verified", enrollmentActive: true };
  }

  // Upsert the payment row.
  if (existingPayment) {
    await supabaseAdmin
      .from("payments")
      .update({ status: "captured", signature: razorpaySignature ?? null, verified_at: new Date().toISOString() })
      .eq("id", existingPayment.id);
  } else {
    await supabaseAdmin.from("payments").insert({
      order_id: order.id,
      user_id: order.user_id,
      course_id: order.course_id,
      razorpay_payment_id: razorpayPaymentId,
      razorpay_order_id: order.razorpay_order_id,
      signature: razorpaySignature ?? null,
      amount: order.amount,
      currency: order.currency,
      status: "captured",
      verified_at: new Date().toISOString(),
    });
  }

  await supabaseAdmin.from("orders").update({ status: "paid" }).eq("id", order.id);

  // Create the enrollment ONLY here, ONLY after verification. The unique index on
  // (user_id, course_id) where status='active' makes this safe to call twice.
  const { data: existingEnrollment } = await supabaseAdmin
    .from("enrollments")
    .select("id")
    .eq("user_id", order.user_id)
    .eq("course_id", order.course_id)
    .eq("status", "active")
    .maybeSingle();

  if (!existingEnrollment) {
    await supabaseAdmin.from("enrollments").insert({
      user_id: order.user_id,
      course_id: order.course_id,
      order_id: order.id,
      status: "active",
    });
  }

  return { status: "verified", enrollmentActive: true };
}
