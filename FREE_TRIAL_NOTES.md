# Free Trial feature
1. Run `supabase/migrations/0003_free_trials.sql` once in Supabase -> SQL Editor.
2. Log in as admin -> Admin -> "Manage Course Free Trials" -> pick course -> add previews -> Publish trial.
3. The course page then shows "TRY FREE BEFORE YOU BUY" above the content.
Preview files live in a separate PUBLIC bucket (`course-trials`); paid files stay in the private `course-files` bucket.
