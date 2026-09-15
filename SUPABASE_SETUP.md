# Supabase Setup

## 1. Run the migrations
In the Supabase SQL editor, run in order:
1. `supabase/migrations/0001_init.sql` — schema, constraints, indexes, RLS policies
2. `supabase/migrations/0002_storage.sql` — private `course-files` bucket, public
   `course-thumbnails` bucket, and their storage policies

## 2. Google OAuth
1. In Google Cloud Console, create an OAuth 2.0 Client ID (Web application).
2. Authorized redirect URI: `https://<your-supabase-project>.supabase.co/auth/v1/callback`
3. In Supabase: **Authentication → Providers → Google** → paste the Client ID and Client
   Secret, enable the provider.
4. Add your production URL (and `http://localhost:5173` for local dev) to
   **Authentication → URL Configuration → Redirect URLs**.
5. Test: log in with Google locally, then again after deploying, and confirm session
   persistence survives a page refresh and a logout/login cycle.

## 3. Email auth
Enabled by default. Under **Authentication → Providers → Email**, decide whether to
require email confirmation before first login (recommended for production).

## 4. Phone/SMS OTP (optional)
Under **Authentication → Providers → Phone**, configure an SMS provider (Twilio, MessageBird,
etc. — this requires its own account and will incur usage-based charges, unlike the rest of
the free-tier stack). Only enable this if you're ready to pay for SMS delivery; the rest of
the platform works fully with just Google + email auth.

## 5. Storage
Both buckets are created by the migration. Do not manually flip `course-files` to public —
its entire security model depends on it staying private and being read only through the
`get-signed-url` Netlify Function.

## 6. Row Level Security
RLS is enabled on every table by the migration. Do not disable it "to make development
easier" — all client-side reads (course listings, dashboard, admin dashboard) depend on
these policies being active and correct. If a query returns fewer rows than expected while
developing, check the relevant policy in `0001_init.sql` before working around it.
