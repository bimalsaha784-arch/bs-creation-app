# Testing Checklist

Run these against a deployed (or `netlify dev`) instance with Razorpay in **Test Mode**
before ever switching to live credentials.

| # | Test | Steps | Expected |
|---|---|---|---|
| 1 | Unpaid user opens paid course | Visit `/courses/:slug` while logged out or without enrollment | "Buy Now" shown, no content leaks |
| 2 | Unpaid user hits protected PDF | Call `GET /api/get-signed-url?lessonId=...` without an active enrollment | `403` |
| 3 | Unpaid user hits protected HTML app | Same as above for an `html_app` lesson | `403` |
| 4 | Course isolation | Buy Course A, then try `/learn/:courseBId` | Course A accessible, Course B `403` |
| 5 | Tampered course ID | Call `/api/create-order` with a `courseId` for a course you don't intend to buy | Order created for *that* course's real price — client can't redirect the charge elsewhere post-hoc |
| 6 | Tampered amount | Inspect network tab; try to alter the amount before Razorpay Checkout opens | Backend already fixed the amount server-side in `create-order`; Checkout uses the order's locked amount |
| 7 | Fake success call | Call `/api/verify-payment` with a made-up `razorpay_payment_id`/signature | Signature check fails → `400`, no enrollment |
| 8 | Invalid signature | Send a slightly modified real signature | Rejected, enrollment not activated |
| 9 | Duplicate webhook | Resend the same webhook event twice from the Razorpay dashboard | Second delivery is a no-op; only one `payments` row (unique on `razorpay_payment_id`) and one active `enrollments` row |
| 10 | Student calls admin-only query | While logged in as a student, try reading another user's `orders`/`payments` row via the Supabase client | Empty result — RLS filters it out |
| 11 | Logged-out learning page | Visit `/learn/:courseId` logged out | Redirected to `/login` |
| 12 | Refund | Trigger `refund.processed` webhook (Razorpay test tools) for a captured payment | `payments.status` → `refunded`, `enrollments.status` → `refunded`, content access denied on next `get-signed-url` call |

## Also verify
- [ ] Refreshing `/courses`, `/dashboard`, `/learn/123` in the browser does not 404
- [ ] Admin dashboard stats load only for an account with `role = 'admin'`
- [ ] A non-admin who directly queries `courses` with `status='draft'` gets nothing back
- [ ] Signed URLs expire after 5 minutes (re-request after waiting confirms a fresh URL is issued)
