-- ============================================================
-- Free Trial / Preview feature
-- Safe to run once in: Supabase dashboard -> SQL Editor -> New query -> Run.
-- It only ADDS things. No existing table, row, policy or file is changed
-- (except one new column `trial_enabled` on courses, default false).
-- ============================================================

-- 1) Per-course switch. Default false = every existing course looks exactly as before.
alter table public.courses
  add column if not exists trial_enabled boolean not null default false;

-- 2) Preview resources. Each row belongs to exactly one course (course_id).
create table if not exists public.course_trial_resources (
  id            uuid primary key default gen_random_uuid(),
  course_id     uuid not null references public.courses(id) on delete cascade,
  title         text not null,
  description   text,
  resource_type text not null check (resource_type in ('html_app', 'video', 'pdf', 'image')),
  storage_path  text not null,          -- path inside the public 'course-trials' bucket
  thumbnail_path text,                  -- optional, same bucket
  position      integer not null default 0,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists course_trial_resources_course_idx
  on public.course_trial_resources (course_id, position);

create or replace function public.touch_trial_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_touch_trial_updated_at on public.course_trial_resources;
create trigger trg_touch_trial_updated_at
  before update on public.course_trial_resources
  for each row execute function public.touch_trial_updated_at();

-- 3) Row Level Security: the public can only READ resources that the admin has
--    switched on, for a published course whose trial is enabled. Only admins can write.
alter table public.course_trial_resources enable row level security;

drop policy if exists "trial_public_read" on public.course_trial_resources;
create policy "trial_public_read" on public.course_trial_resources
  for select using (
    public.is_admin(auth.uid())
    or (
      is_active
      and exists (
        select 1 from public.courses c
        where c.id = course_trial_resources.course_id
          and c.status = 'published'
          and c.trial_enabled
      )
    )
  );

drop policy if exists "trial_admin_insert" on public.course_trial_resources;
create policy "trial_admin_insert" on public.course_trial_resources
  for insert with check (public.is_admin(auth.uid()));

drop policy if exists "trial_admin_update" on public.course_trial_resources;
create policy "trial_admin_update" on public.course_trial_resources
  for update using (public.is_admin(auth.uid()));

drop policy if exists "trial_admin_delete" on public.course_trial_resources;
create policy "trial_admin_delete" on public.course_trial_resources
  for delete using (public.is_admin(auth.uid()));

-- 4) Storage. A SEPARATE public bucket, so paid files in the private 'course-files'
--    bucket stay exactly as protected as before. Anything uploaded to 'course-trials'
--    is public on purpose (it is the free preview). Only admins can upload/change/delete.
insert into storage.buckets (id, name, public)
values ('course-trials', 'course-trials', true)
on conflict (id) do nothing;

drop policy if exists "trials_bucket_public_read" on storage.objects;
create policy "trials_bucket_public_read" on storage.objects
  for select using (bucket_id = 'course-trials');

drop policy if exists "trials_bucket_admin_insert" on storage.objects;
create policy "trials_bucket_admin_insert" on storage.objects
  for insert with check (bucket_id = 'course-trials' and public.is_admin(auth.uid()));

drop policy if exists "trials_bucket_admin_update" on storage.objects;
create policy "trials_bucket_admin_update" on storage.objects
  for update using (bucket_id = 'course-trials' and public.is_admin(auth.uid()));

drop policy if exists "trials_bucket_admin_delete" on storage.objects;
create policy "trials_bucket_admin_delete" on storage.objects
  for delete using (bucket_id = 'course-trials' and public.is_admin(auth.uid()));
