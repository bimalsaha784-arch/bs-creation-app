import type { Handler } from "@netlify/functions";
import { supabaseAdmin, json } from "./utils/supabaseAdmin";
import { verifyWebhookSignature } from "./utils/razorpay";
import { activateOrder } from "./verify-payment";

/**
 * POST /api/payments/razorpay/webhook  (mapped via netlify.toml redirect to
 * /.netlify/functions/razorpay-webhook)
 *
 * This is the SOURCE OF TRUTH for payment state — configure this URL in the
 * Razorpay dashboard. It must work even if the student's browser never calls
 * verify-payment (closed tab, crashed app, network drop).
 *
 * Idempotent: Razorpay may deliver the same event more than once. We key off
 * razorpay_payment_id, which has a unique constraint in the `payments` table,
 * so re-processing never creates a duplicate enrollment.
 */
export const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });

  const rawBody = event.body || "";
  const signatureHeader = event.headers["x-razorpay-signature"] || event.headers["X-Razorpay-Signature"];

  if (!verifyWebhookSignature(rawBody, signatureHeader)) {
    return json(400, { error: "Invalid webhook signature" });
  }

  let webhookEvent: any;
  try {
    webhookEvent = JSON.parse(rawBody);
  } catch {
    return json(400, { error: "Invalid JSON" });
  }

  const eventType = webhookEvent.event as string;

  try {
    if (eventType === "payment.captured" || eventType === "order.paid") {
      const payment = webhookEvent.payload?.payment?.entity;
      const razorpayOrderId = payment?.order_id;
      const razorpayPaymentId = payment?.id;
      if (!razorpayOrderId || !razorpayPaymentId) return json(200, { received: true });

      const { data: order } = await supabaseAdmin
        .from("orders")
        .select("*")
        .eq("razorpay_order_id", razorpayOrderId)
        .single();

      if (order) {
        await activateOrder({ order, razorpayPaymentId });
      }
    }

    if (eventType === "payment.failed") {
      const payment = webhookEvent.payload?.payment?.entity;
      const razorpayOrderId = payment?.order_id;
      if (razorpayOrderId) {
        await supabaseAdmin.from("orders").update({ status: "failed" }).eq("razorpay_order_id", razorpayOrderId);
      }
    }

    if (eventType === "refund.processed") {
      const refund = webhookEvent.payload?.refund?.entity;
      const razorpayPaymentId = refund?.payment_id;
      if (razorpayPaymentId) {
        const { data: payment } = await supabaseAdmin
          .from("payments")
          .select("*")
          .eq("razorpay_payment_id", razorpayPaymentId)
          .single();

        if (payment) {
          await supabaseAdmin.from("payments").update({ status: "refunded" }).eq("id", payment.id);
          await supabaseAdmin
            .from("enrollments")
            .update({ status: "refunded" })
            .eq("user_id", payment.user_id)
            .eq("course_id", payment.course_id)
            .eq("status", "active");
        }
      }
    }
  } catch (err) {
    console.error("Webhook processing error:", err);
    // Still return 200 only if we truly can't recover; otherwise let Razorpay retry.
    return json(500, { error: "Processing error, please retry" });
  }

  return json(200, { received: true });
};
