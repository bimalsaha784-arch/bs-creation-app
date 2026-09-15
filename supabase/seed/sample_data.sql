-- Optional: sample published course for local testing/demo purposes.
-- Safe to run repeatedly (upserts on slug).
insert into public.courses (title, slug, description, short_description, price, discount_price, currency, instructor_name, duration, level, language, status)
values (
  'Intro to Web Development',
  'intro-to-web-development',
  'A practical introduction to building websites: HTML, CSS, and the fundamentals of how the web works.',
  'Start building real websites from scratch.',
  999, 499, 'INR', 'BS Creation Team', '4 hours', 'Beginner', 'English', 'published'
)
on conflict (slug) do nothing;
