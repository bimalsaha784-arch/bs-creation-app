# Security Model

This document maps every security requirement in the spec to where it's actually enforced
in code, and is explicit about the one area (HTML application delivery) that has an
inherent client-side limitation.

## Pricing integrity
- The browser never sends a price or amount. It sends only a `courseId`.
- `netlify/functions/create-order.ts` reads the price from `courses.price` /
  `discount_price` in the database and uses that to create the Razorpay order.
- Enforced server-side only — there is no code path where a client-supplied amount
  reaches Razorpay or the database.

## Payment verification
- `verify-payment.ts` recomputes the HMAC-SHA256 signature from the Razorpay order id +
  payment id using `RAZORPAY_KEY_SECRET` (server-only) and compares it with
  `crypto.timingSafeEqual`. A payment is never marked `captured` without this passing.
- `razorpay-webhook.ts` is the source of truth: it independently verifies the
  `X-Razorpay-Signature` header against the raw request body using
  `RAZORPAY_WEBHOOK_SECRET`, and performs the same activation logic
  (`activateOrder`, shared with `verify-payment.ts`). This means even if the
  student's browser never calls `verify-payment` (closed tab, crash, network drop),
  the webhook still activates the enrollment once Razorpay confirms the payment.

## Idempotency
- `payments.razorpay_payment_id` has a unique constraint. `activateOrder()` checks for
  an existing `captured` payment before doing anything, so a duplicate webhook delivery
  (Razorpay explicitly says webhooks can be delivered more than once) never creates a
  second enrollment.
- `enrollments` has a unique index on `(user_id, course_id) WHERE status = 'active'`,
  which is a second, independent guarantee against duplicate active enrollments even if
  application logic had a bug.

## Enrollment as the only access gate
- No table or code path lets a student set their own `enrollments.status`. RLS grants
  students `SELECT` only on their own enrollments; all `INSERT`/`UPDATE` happens through
  Netlify Functions using the service role key, which bypasses RLS but is never reachable
  from the browser.
- `get-signed-url.ts` re-derives access on every single request: authenticate → find the
  lesson → find its course → check for an active enrollment (or admin role) → only then
  mint a short-lived (5 minute) signed URL from the private `course-files` bucket.

## Role security
- `profiles.role` can only be changed directly in the Supabase SQL editor (see
  `SUPABASE_SETUP.md`) or by an existing admin through the (RLS-protected) admin policy.
  The `profiles_update_own_no_role_change` policy explicitly blocks a user from changing
  their own `role` column, even though they can update their own profile row.

## Row Level Security summary
| Table | Student can | Student cannot |
|---|---|---|
| profiles | read/update own row (not `role`) | read/write others', change own role |
| courses | read published only | write anything |
| orders | read own | insert/update (functions only, via service role) |
| payments | read own | insert/update |
| enrollments | read own | insert/update |
| progress | read/write own, only if actively enrolled | write for a course they don't own |

## Protected PDF and video delivery
Handled the same way as HTML apps: private bucket, signed URL, 5-minute expiry, checked
on every request. PDFs additionally respect the admin-configurable `allow_pdf_download`
flag on the course, which controls whether the signed URL is issued with
`Content-Disposition: attachment`.

## Protected HTML application delivery — documented limitation
The spec is right to flag this as the hardest case. What's implemented:
- The HTML app's `content_reference` points to a single file in the private bucket,
  served only via a signed URL from `get-signed-url.ts` after the same auth+enrollment
  check as everything else. There is no public path or predictable URL for it.
- The iframe is sandboxed (`sandbox="allow-scripts allow-same-origin"`), limiting what
  the embedded app can do.

What is **not** solved, and can't be fully solved by any web app:
- If the HTML application references *sibling* assets (its own CSS/JS/images as separate
  files rather than inlined), those sibling requests would need their own signed URLs —
  the current implementation assumes a single self-contained file (inline `<style>` and
  `<script>`, or a bundled/inlined build). If you need multi-file HTML apps, extend
  `get-signed-url.ts` into a small proxy function that fetches the whole object tree from
  storage server-side and rewrites asset paths, rather than issuing bucket signed URLs
  directly to the browser.
- Once a signed URL is issued to a legitimate, authorized student, nothing prevents that
  student from saving the HTML/JS themselves, or from screen-recording video/PDF content.
  This is true of every web-based course platform; the goal here is preventing
  *unauthorized* access (no login, no purchase, no direct URL guessing), not preventing an
  authorized user from ever seeing the bytes they were legitimately shown.

## What to test before trusting this in production
See `TESTING.md` — every scenario in the spec's "Security Tests" section (Test 1–12) maps
to a specific check described above.
