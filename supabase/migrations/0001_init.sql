-- BS Creation — Initial schema, constraints, indexes, and Row Level Security
-- Apply with: supabase db push   (or paste into the Supabase SQL editor)

create extension if not exists "pgcrypto";

-- ============================================================
-- ENUM TYPES
-- ============================================================
create type public.user_role as enum ('student', 'admin');
create type public.course_status as enum ('draft', 'published', 'archived');
create type public.lesson_content_type as enum ('pdf', 'html_app', 'video', 'text', 'quiz');
create type public.order_status as enum ('created', 'pending', 'paid', 'failed', 'cancelled', 'expired');
create type public.payment_status as enum ('created', 'authorized', 'captured', 'failed', 'refunded');
create type public.enrollment_status as enum ('active', 'cancelled', 'refunded', 'expired');

-- ============================================================
-- PROFILES  (mirrors auth.users, internal UUID is the real identity)
-- ============================================================
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  phone text,
  avatar_url text,
  role public.user_role not null default 'student',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Auto-create a profile row whenever a new auth user signs up (Google, email, phone all funnel here)
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, email, phone, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.email,
    new.phone,
    'student'
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- COURSES
-- ============================================================
create table public.courses (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  description text,
  short_description text,
  thumbnail_url text,
  price numeric(10,2) not null check (price >= 0),
  discount_price numeric(10,2) check (discount_price is null or discount_price >= 0),
  currency text not null default 'INR',
  instructor_name text,
  duration text,
  level text,
  language text default 'English',
  status public.course_status not null default 'draft',
  allow_pdf_download boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint discount_lt_price check (discount_price is null or discount_price <= price)
);
create index idx_courses_status on public.courses(status);
create index idx_courses_slug on public.courses(slug);

-- ============================================================
-- MODULES
-- ============================================================
create table public.modules (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  title text not null,
  description text,
  position int not null default 0,
  created_at timestamptz not null default now()
);
create index idx_modules_course on public.modules(course_id, position);

-- ============================================================
-- LESSONS
-- ============================================================
create table public.lessons (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references public.modules(id) on delete cascade,
  title text not null,
  description text,
  content_type public.lesson_content_type not null,
  -- content_reference is a Storage object path (private bucket), NEVER a public URL
  content_reference text,
  position int not null default 0,
  duration text,
  status public.course_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_lessons_module on public.lessons(module_id, position);

-- Helper: which course does a lesson belong to (used by RLS + functions)
create or replace function public.course_id_for_lesson(p_lesson_id uuid)
returns uuid as $$
  select m.course_id from public.lessons l
  join public.modules m on m.id = l.module_id
  where l.id = p_lesson_id;
$$ language sql stable security definer set search_path = public;

-- ============================================================
-- ORDERS  (created before Razorpay checkout opens)
-- ============================================================
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete restrict,
  amount numeric(10,2) not null check (amount >= 0),
  currency text not null default 'INR',
  razorpay_order_id text unique,
  status public.order_status not null default 'created',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_orders_user on public.orders(user_id);
create index idx_orders_course on public.orders(course_id);
create unique index uniq_pending_order_per_user_course
  on public.orders(user_id, course_id)
  where status in ('created', 'pending');

-- ============================================================
-- PAYMENTS  (one row per Razorpay payment attempt against an order)
-- ============================================================
create table public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete restrict,
  razorpay_payment_id text unique,
  razorpay_order_id text not null,
  signature text,
  amount numeric(10,2) not null,
  currency text not null default 'INR',
  status public.payment_status not null default 'created',
  verified_at timestamptz,
  created_at timestamptz not null default now()
);
create index idx_payments_user on public.payments(user_id);
create index idx_payments_order on public.payments(order_id);

-- ============================================================
-- ENROLLMENTS  (the ONLY table that grants course access)
-- ============================================================
create table public.enrollments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete restrict,
  order_id uuid references public.orders(id) on delete set null,
  status public.enrollment_status not null default 'active',
  enrolled_at timestamptz not null default now(),
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_enrollments_user on public.enrollments(user_id);
-- Prevent duplicate *active* enrollment for the same user/course
create unique index uniq_active_enrollment on public.enrollments(user_id, course_id) where status = 'active';

-- ============================================================
-- PROGRESS
-- ============================================================
create table public.progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  completed boolean not null default false,
  last_accessed_at timestamptz default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, lesson_id)
);
create index idx_progress_user_course on public.progress(user_id, course_id);

-- ============================================================
-- Convenience view: is a given user actively enrolled in a course?
-- ============================================================
create or replace function public.is_enrolled(p_user uuid, p_course uuid)
returns boolean as $$
  select exists (
    select 1 from public.enrollments e
    where e.user_id = p_user
      and e.course_id = p_course
      and e.status = 'active'
      and (e.expires_at is null or e.expires_at > now())
  );
$$ language sql stable security definer set search_path = public;

create or replace function public.is_admin(p_user uuid)
returns boolean as $$
  select exists (select 1 from public.profiles where id = p_user and role = 'admin');
$$ language sql stable security definer set search_path = public;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table public.profiles enable row level security;
alter table public.courses enable row level security;
alter table public.modules enable row level security;
alter table public.lessons enable row level security;
alter table public.orders enable row level security;
alter table public.payments enable row level security;
alter table public.enrollments enable row level security;
alter table public.progress enable row level security;

-- PROFILES: users see/update only their own row; role can never be changed by the user
create policy "profiles_select_own" on public.profiles
  for select using (id = auth.uid() or public.is_admin(auth.uid()));

create policy "profiles_update_own_no_role_change" on public.profiles
  for update using (id = auth.uid())
  with check (id = auth.uid() and role = (select role from public.profiles where id = auth.uid()));

create policy "profiles_admin_all" on public.profiles
  for all using (public.is_admin(auth.uid()));

-- COURSES: anyone can read published courses; only admins can write / see drafts
create policy "courses_public_read_published" on public.courses
  for select using (status = 'published' or public.is_admin(auth.uid()));

create policy "courses_admin_write" on public.courses
  for insert with check (public.is_admin(auth.uid()));
create policy "courses_admin_update" on public.courses
  for update using (public.is_admin(auth.uid()));
create policy "courses_admin_delete" on public.courses
  for delete using (public.is_admin(auth.uid()));

-- MODULES / LESSONS: metadata is readable if course is published (title/position only —
-- content_reference should still only be resolved via the signed-url function, never
-- fetched directly by the client for gating purposes). Admins have full access.
create policy "modules_read" on public.modules
  for select using (
    public.is_admin(auth.uid())
    or exists (select 1 from public.courses c where c.id = course_id and c.status = 'published')
  );
create policy "modules_admin_write" on public.modules for insert with check (public.is_admin(auth.uid()));
create policy "modules_admin_update" on public.modules for update using (public.is_admin(auth.uid()));
create policy "modules_admin_delete" on public.modules for delete using (public.is_admin(auth.uid()));

create policy "lessons_read_metadata" on public.lessons
  for select using (
    public.is_admin(auth.uid())
    or exists (
      select 1 from public.modules m join public.courses c on c.id = m.course_id
      where m.id = module_id and c.status = 'published'
    )
  );
create policy "lessons_admin_write" on public.lessons for insert with check (public.is_admin(auth.uid()));
create policy "lessons_admin_update" on public.lessons for update using (public.is_admin(auth.uid()));
create policy "lessons_admin_delete" on public.lessons for delete using (public.is_admin(auth.uid()));

-- ORDERS: users see only their own orders; NOTHING can be inserted/updated by students directly —
-- orders are created and mutated only by Netlify Functions using the service role key.
create policy "orders_select_own" on public.orders
  for select using (user_id = auth.uid() or public.is_admin(auth.uid()));
create policy "orders_admin_all" on public.orders
  for all using (public.is_admin(auth.uid()));
-- No insert/update/delete policy for plain authenticated students -> RLS denies by default.

-- PAYMENTS: same pattern — read-only for the owner, all writes via service role in functions.
create policy "payments_select_own" on public.payments
  for select using (user_id = auth.uid() or public.is_admin(auth.uid()));
create policy "payments_admin_all" on public.payments
  for all using (public.is_admin(auth.uid()));

-- ENROLLMENTS: read-only for the owner. Students can NEVER insert/update their own enrollment —
-- enrollment is only ever created by the payment-verification function (service role).
create policy "enrollments_select_own" on public.enrollments
  for select using (user_id = auth.uid() or public.is_admin(auth.uid()));
create policy "enrollments_admin_all" on public.enrollments
  for all using (public.is_admin(auth.uid()));

-- PROGRESS: users may read/write only their OWN progress, and only for lessons in a course
-- they are actively enrolled in.
create policy "progress_select_own" on public.progress
  for select using (user_id = auth.uid() or public.is_admin(auth.uid()));
create policy "progress_insert_own_if_enrolled" on public.progress
  for insert with check (user_id = auth.uid() and public.is_enrolled(auth.uid(), course_id));
create policy "progress_update_own_if_enrolled" on public.progress
  for update using (user_id = auth.uid() and public.is_enrolled(auth.uid(), course_id));
create policy "progress_admin_all" on public.progress
  for all using (public.is_admin(auth.uid()));

-- ============================================================
-- Bootstrap: promote the first admin manually (never via a student-reachable API).
-- Run once, after your own account exists, from the Supabase SQL editor:
--   update public.profiles set role = 'admin' where email = 'you@example.com';
-- ============================================================
