# Redesign — what changed

## Not touched (verified before changing anything)
- `netlify/functions/*` — create-order, verify-payment, razorpay-webhook, get-signed-url
- `supabase/migrations/*` — schema, RLS, storage policies
- Enrollment / access logic. The backend already allowed a user to own many courses
  (one enrollment row per user + course; create-order only blocks re-buying the *same*
  course). The "single course" feeling was purely the dashboard UI.

## Payment flow
The Razorpay checkout code moved verbatim from `CourseDetail.tsx` into
`src/hooks/useCheckout.ts`, so course cards and the course page share the exact same
flow (create-order → Razorpay → verify-payment). Additions: BS Creation logo and
student name in the Razorpay popup; after a successful purchase the dashboard shows a
confirmation and highlights the new course.

## New / changed
- `src/config/brand.ts` + `public/assets/logo.png` — single place to change the logo (see BRANDING_AND_COURSES.md)
- **Dashboard** — "Welcome back!", **My courses** (progress, Continue learning, Access course) and
  **Explore more courses** (every published course the student doesn't own, with Buy now + View all courses)
- **Courses page** — search, and Purchased / Not purchased filters for logged-in students
- **Course page** — Purchased state with Access course (no payment button), collapsible subjects,
  locked-lesson icons, sticky Buy bar on mobile, "Explore more courses" row, proper not-found page
- **Course player** — completed ticks, progress bar, next-lesson button, back to My courses,
  "open PDF in new tab" fallback for phones
- **Profile page** (`/profile`) — edit name/phone; payment history moved here from the dashboard
- **Navigation** — logged-out: Home, Courses, My Courses, About; logged-in: Dashboard, My Courses,
  Explore Courses, About + profile menu; full mobile menu
- **Admin** — new "Course details" editor (title, descriptions, instructor, duration, level, language)

## Bug fixed
`AdminCourseEdit.tsx` uploaded **every** lesson file with `contentType: "text/html"`, so PDFs
uploaded through the admin panel were served as HTML and showed as garbled text in the course
player. Now only HTML-app lessons are forced to `text/html`; other files keep their real type.
**Any PDF uploaded before this fix should be re-uploaded** from the admin panel.
