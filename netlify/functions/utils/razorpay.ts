import crypto from "crypto";

const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID as string;
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET as string;
const RAZORPAY_WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET as string;

/**
 * Creates a Razorpay order via the REST API using fetch + Basic Auth.
 * We deliberately avoid depending on the razorpay npm SDK to keep the
 * function bundle small; the REST surface used here is stable.
 */
export async function createRazorpayOrder(params: {
  amountInPaise: number;
  currency: string;
  receipt: string;
  notes?: Record<string, string>;
}) {
  const auth = Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString("base64");
  const res = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount: params.amountInPaise, // smallest currency unit
      currency: params.currency,
      receipt: params.receipt,
      notes: params.notes ?? {},
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Razorpay order creation failed: ${res.status} ${text}`);
  }
  return res.json() as Promise<{ id: string; amount: number; currency: string; status: string }>;
}

/**
 * Verifies the checkout-handler signature:
 * HMAC_SHA256(razorpay_order_id + "|" + razorpay_payment_id, key_secret) === razorpay_signature
 */
export function verifyCheckoutSignature(params: {
  orderId: string;
  paymentId: string;
  signature: string;
}): boolean {
  const expected = crypto
    .createHmac("sha256", RAZORPAY_KEY_SECRET)
    .update(`${params.orderId}|${params.paymentId}`)
    .digest("hex");
  return timingSafeEqual(expected, params.signature);
}

/**
 * Verifies a Razorpay webhook signature:
 * HMAC_SHA256(raw request body, webhook_secret) === X-Razorpay-Signature header
 */
export function verifyWebhookSignature(rawBody: string, signatureHeader: string | undefined): boolean {
  if (!signatureHeader) return false;
  const expected = crypto.createHmac("sha256", RAZORPAY_WEBHOOK_SECRET).update(rawBody).digest("hex");
  return timingSafeEqual(expected, signatureHeader);
}

function timingSafeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}
