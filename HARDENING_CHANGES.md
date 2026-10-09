# Hardening changes (from the "why AI-built sites crash" checklist)

**Error handling**
- `ErrorBoundary` (new): a crash in one page shows a friendly message instead of a blank screen. Used in `Layout` (navbar stays usable) and around the whole app.
- `LoadError` (new): "Try again" box shown when a request fails. A failed request no longer looks like "you own no courses" / "no courses published".
- Home, Courses, Dashboard, CourseDetail, Profile, Learn, admin pages: loading state always ends (`try/finally`), errors are shown, "Try again" added.
- `catalog.ts`: course/enrollment queries now throw on failure instead of silently returning empty lists.
- `useAuth`: a failed session/profile read can no longer leave the app on a spinner forever.
- Admin course editor: every add/delete/upload/save now reports errors. Empty price box can no longer save as price 0. Lesson type is validated. Files over 50 MB are rejected with a clear message.

**Load**
- Profile payment history capped at 100 rows, admin course list at 200.

**Quality gate**
- `.github/workflows/build.yml`: GitHub runs the same build as Netlify (type-check + build) on every push, before any Netlify credits are spent.

**Still to do by hand**
- Commit `package-lock.json` (run `npm install --package-lock-only`) so builds use fixed package versions.
- Error tracking (e.g. Sentry free plan) and a Supabase backup routine.
