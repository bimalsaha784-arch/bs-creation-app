# Build Status — What's Real, What's a Starting Point

Per the project's own rule ("if any requirement cannot be implemented securely, don't fake
it — explain the limitation instead"), here's an honest breakdown.

## Fully implemented, real, and security-critical (the parts that must never be faked)
- **Database schema + RLS**: every table from the spec, with the exact constraints
  described (unique active enrollment, discount ≤ price, foreign keys, indexes).
- **Pricing**: always read server-side from `courses` table; the frontend never sends a
  price.
- **Razorpay order creation**: real REST call to Razorpay, real order id, idempotent
  reuse of pending orders.
- **Payment verification**: real HMAC signature check with `timingSafeEqual`, both in the
  checkout-handler path and independently in the webhook.
- **Webhook**: real signature verification, idempotent processing, handles
  captured/failed/refunded.
- **Enrollment creation**: only ever happens after verification, in one shared function
  used by both paths, protected by a DB-level unique constraint as a second line of
  defense.
- **Protected content delivery**: PDFs, HTML apps, and video are all served through
  short-lived signed URLs from a private bucket, gated by a real enrollment check on
  every request — never a public path, never a frontend flag.
- **Role security**: admin role can't be self-granted; enforced by RLS at the database
  level, not just a frontend check.

## Functional, but intentionally minimal — extend before a real public launch
- **Admin content management UI**: course create + basic module/lesson/file upload is
  wired up and functional (it writes real rows and real files to the private bucket), but
  it's intentionally plain — no drag-to-reorder UI, no rich text editor, no quiz builder.
  The `position` columns and admin RLS policies are ready for a nicer UI on top.
- **Admin users/orders/payments browsing screens**: the dashboard shows aggregate stats;
  dedicated searchable tables for users/orders/payments (listed in the spec) are not yet
  built as separate pages. The queries would follow the same pattern as `Dashboard.tsx`
  and are straightforward to add — flagged here rather than silently skipped.
- **Phone/OTP auth**: schema and profile linking support it, but it's not wired into the
  UI, since it requires you to pick and pay for an SMS provider (see `SUPABASE_SETUP.md`).
  Google + email auth are fully wired.
- **Transactional emails**: not implemented (matches the spec's "don't make this
  mandatory for MVP unless credentials are provided" instruction). The data model and
  webhook events already have the right hooks (e.g. `payment.captured`) to add these
  later without restructuring anything.
- **SEO metadata (sitemap.xml, structured data, per-page Open Graph tags)**: base `<title>`
  and meta description are in `index.html`; per-course dynamic meta tags and a generated
  sitemap are not yet built.

## Explicitly documented limitation (not a bug — a real constraint of any web app)
- Multi-file HTML applications (an app with separate CSS/JS files rather than one
  self-contained file) need a small proxy function rather than direct bucket signed URLs.
  See the "Protected HTML application delivery" section of `SECURITY.md`.

## Before you take real payments
Complete every item in `TESTING.md` in Razorpay Test Mode first. Do not switch to live
Razorpay keys until all twelve security tests pass.
