# Setup — Zero to Running

## 1. Create a Supabase project
1. Go to https://supabase.com and create a new project (free tier is fine).
2. In the SQL editor, run the contents of `supabase/migrations/0001_init.sql`, then
   `supabase/migrations/0002_storage.sql`, in that order.
3. In **Project Settings → API**, copy:
   - `Project URL` → used as `SUPABASE_URL` and `VITE_SUPABASE_URL`
   - `anon` public key → `VITE_SUPABASE_ANON_KEY`
   - `service_role` secret key → `SUPABASE_SERVICE_ROLE_KEY` (Netlify env only — never in `VITE_` vars)

## 2. Create your first admin user
1. Register a normal account through the app (`/register`) or Supabase Auth UI.
2. In the Supabase SQL editor, run:
   ```sql
   update public.profiles set role = 'admin' where email = 'you@example.com';
   ```
   This is the only supported way to create an admin — there is intentionally no
   API endpoint a browser session can call to grant itself the admin role.

## 3. Configure Google login
See `SUPABASE_SETUP.md` for exact steps.

## 4. Create a Razorpay account
See `PAYMENT_SETUP.md`.

## 5. Local development
```bash
npm install
cp .env.example .env
# fill in VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_RAZORPAY_KEY_ID
npm run dev
```
Netlify Functions need the Netlify CLI to run locally alongside Vite:
```bash
npm install -g netlify-cli
netlify dev
```
`netlify dev` proxies both the Vite frontend and the functions in `netlify/functions`,
and reads the same `.env` for the server-only variables (`SUPABASE_SERVICE_ROLE_KEY`,
`RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`).

## 6. Deploy
See `DEPLOYMENT.md`.
