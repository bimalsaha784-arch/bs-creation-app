# BS Creation — Online Course Platform

A real online course marketplace: React + TypeScript + Tailwind frontend, Netlify Functions
backend, Supabase (Postgres + Auth + Storage) database, Razorpay payments.

This is a working application, not a mockup. Every rule that matters for security —
real prices from the database, server-verified payments, Row Level Security, signed URLs
for protected content — is implemented in code, not simulated. See **SECURITY.md** for exactly
what's enforced where, and **STATUS.md** for what's fully built vs. what you'll extend before a
public launch.

## Stack
- Frontend: React + TypeScript + Tailwind, built with Vite
- Hosting: Netlify (static frontend + serverless functions)
- Backend: Netlify Functions (`netlify/functions`)
- Database/Auth/Storage: Supabase
- Payments: Razorpay (real orders, real server-side signature verification, real webhook)

## Quick start
```bash
npm install
cp .env.example .env    # fill in your Supabase + Razorpay values
npm run dev
```
See **SETUP.md** for the full zero-to-running walkthrough (Supabase project, Razorpay
account, Google OAuth, Netlify deploy).

## Where things live
- `supabase/migrations/` — the entire database schema and Row Level Security policies
- `netlify/functions/` — the only code allowed to touch Razorpay secrets or the Supabase
  service role key
- `src/pages` — the actual pages listed in the spec (public, student, admin)
- `docs/` via the root-level `*.md` files — setup, deployment, security, testing docs

## Read these before going live
1. `SUPABASE_SETUP.md`
2. `PAYMENT_SETUP.md`
3. `SECURITY.md`
4. `TESTING.md`
5. `STATUS.md` — what's implemented vs. what's stubbed and why
