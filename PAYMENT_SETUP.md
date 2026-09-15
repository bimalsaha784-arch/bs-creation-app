# Razorpay Setup

## 1. Create a Razorpay account
Sign up at https://razorpay.com and complete KYC when you're ready to accept real payments.
You can build and test everything below in **Test Mode** first, without KYC.

## 2. Get your API keys
Dashboard → **Settings → API Keys** → Generate Test Key (and later, Live Key).
You'll get a `Key ID` and `Key Secret`.

## 3. Add credentials to Netlify
- `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` → Netlify env vars (functions-only)
- `VITE_RAZORPAY_KEY_ID` → same Key ID, but as a frontend var (the key ID is meant to be
  public; Razorpay Checkout needs it in the browser). **Never** put `RAZORPAY_KEY_SECRET`
  in a `VITE_` variable.

## 4. Configure the webhook
Dashboard → **Settings → Webhooks → Add New Webhook**
- URL: `https://<your-site>.netlify.app/.netlify/functions/razorpay-webhook`
- Secret: generate one and save it as `RAZORPAY_WEBHOOK_SECRET` in Netlify
- Active events to enable:
  - `payment.captured`
  - `order.paid`
  - `payment.failed`
  - `refund.processed`

## 5. Test in Test Mode
Use Razorpay's test cards (published in their docs) to run through:
- A successful payment → confirm an `enrollments` row is created with `status = active`
- A failed payment → confirm the order's status becomes `failed` and no enrollment appears
- Trigger the webhook twice for the same payment (Razorpay dashboard lets you resend a
  webhook delivery) → confirm only one `enrollments` row exists

## 6. Go live only after testing passes
Generate Live keys, replace the Netlify env vars, and re-register the webhook URL under
Live Mode (Razorpay keeps test and live webhooks separate). Do not flip to live keys
before you've completed `TESTING.md`.
