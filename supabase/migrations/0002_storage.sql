-- Private storage bucket for all paid content (PDFs, HTML app bundles, videos, thumbnails).
-- Thumbnails can live in a separate public bucket since they're marketing material, not paid content.

insert into storage.buckets (id, name, public)
values ('course-files', 'course-files', false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('course-thumbnails', 'course-thumbnails', true)
on conflict (id) do nothing;

-- Nobody gets direct client-side access to course-files. All reads go through the
-- get-signed-url Netlify Function, which uses the service role key (bypasses RLS,
-- runs only after verifying auth + active enrollment) to mint a short-lived signed URL.
-- So: no permissive SELECT policy here at all for authenticated/anon roles.

-- Admins may manage files through the dashboard using their authenticated session,
-- since admin-ness is checked via is_admin() and storage policies can reference it.
create policy "course_files_admin_all"
  on storage.objects for all
  using (bucket_id = 'course-files' and public.is_admin(auth.uid()))
  with check (bucket_id = 'course-files' and public.is_admin(auth.uid()));

-- Thumbnails: public read (they're marketing assets, not paid content), admin write.
create policy "thumbnails_public_read"
  on storage.objects for select
  using (bucket_id = 'course-thumbnails');

create policy "thumbnails_admin_write"
  on storage.objects for insert
  with check (bucket_id = 'course-thumbnails' and public.is_admin(auth.uid()));

create policy "thumbnails_admin_update"
  on storage.objects for update
  using (bucket_id = 'course-thumbnails' and public.is_admin(auth.uid()));
