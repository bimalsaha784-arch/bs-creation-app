# Deployment (Netlify)

## 1. Push to GitHub
Initialize a git repo if you haven't, commit, and push to a GitHub repository.
`.env` is already covered by a typical `.gitignore` for Vite projects — **never commit
real secrets**. Only `.env.example` should be in the repo.

## 2. Create the Netlify site
1. In Netlify: **Add new site → Import an existing project** → connect your GitHub repo.
2. Build settings (already defined in `netlify.toml`, Netlify should auto-detect them):
   - Build command: `npm run build`
   - Publish directory: `dist`
   - Functions directory: `netlify/functions`

## 3. Environment variables
In **Site settings → Environment variables**, add:

Frontend (exposed to the browser bundle — safe by design):
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_RAZORPAY_KEY_ID`
- `VITE_SITE_URL` (your production URL, e.g. `https://bscreation.netlify.app`)

Functions only (never prefixed with `VITE_`, never sent to the browser):
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `RAZORPAY_KEY_ID`
- `RAZORPAY_KEY_SECRET`
- `RAZORPAY_WEBHOOK_SECRET`
- `SITE_URL`

## 4. SPA routing
`netlify.toml` already includes a catch-all redirect to `index.html`, so refreshing
`/courses`, `/dashboard`, `/learn/:id`, etc. will not 404. Nothing further to configure.

## 5. Webhook URL
Once deployed, your webhook endpoint is:
```
https://<your-site>.netlify.app/.netlify/functions/razorpay-webhook
```
(the `/api/payments/razorpay/webhook` path from the spec is mapped to this function via
the `/api/*` redirect in `netlify.toml`). Register this exact URL in the Razorpay
dashboard — see `PAYMENT_SETUP.md`.

## 6. Redeploy after any env var change
Netlify Functions read environment variables at build/deploy time — trigger a redeploy
after adding or changing any variable.
