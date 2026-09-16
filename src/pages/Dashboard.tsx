import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../hooks/useAuth";
import type { Course } from "../types";

interface OwnedCourse extends Course {
  progressPct: number;
  lastLessonId: string | null;
}

export function Dashboard() {
  const { user, profile } = useAuth();
  const [courses, setCourses] = useState<OwnedCourse[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: enrollments } = await supabase
        .from("enrollments")
        .select("course_id, courses(*)")
        .eq("user_id", user.id)
        .eq("status", "active");

      const owned: OwnedCourse[] = [];
      for (const e of enrollments ?? []) {
        const course = (e as any).courses as Course;
        if (!course) continue;

        const { count: totalLessons } = await supabase
          .from("lessons")
          .select("id, modules!inner(course_id)", { count: "exact", head: true })
          .eq("modules.course_id", course.id);

        const { count: completedLessons } = await supabase
          .from("progress")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("course_id", course.id)
          .eq("completed", true);

        const { data: lastProgress } = await supabase
          .from("progress")
          .select("lesson_id, last_accessed_at")
          .eq("user_id", user.id)
          .eq("course_id", course.id)
          .order("last_accessed_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        const pct = totalLessons ? Math.round(((completedLessons ?? 0) / totalLessons) * 100) : 0;
        owned.push({ ...course, progressPct: pct, lastLessonId: lastProgress?.lesson_id ?? null });
      }
      setCourses(owned);

      const { data: paymentRows } = await supabase
        .from("payments")
        .select("id, amount, currency, status, created_at, courses(title)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      setPayments(paymentRows ?? []);

      setLoading(false);
    })();
  }, [user?.id]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="text-2xl font-bold text-slate-900">
        Welcome back{profile?.full_name ? `, ${profile.full_name}` : ""}
      </h1>

      <h2 className="mt-10 text-lg font-semibold text-slate-900">My Courses</h2>
      {loading ? (
        <p className="mt-4 text-slate-500">Loading…</p>
      ) : courses.length === 0 ? (
        <p className="mt-4 text-slate-500">
          You haven't purchased any courses yet. <Link to="/courses" className="text-brand-600">Browse courses</Link>
        </p>
      ) : (
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((c) => (
            <div key={c.id} className="rounded-2xl border border-slate-200 p-4 hover:shadow-md">
              <Link to={`/learn/${c.id}`}>
                <div className="aspect-video overflow-hidden rounded-lg bg-slate-100">
                  {c.thumbnail_url && <img src={c.thumbnail_url} className="h-full w-full object-cover" />}
                </div>
                <div className="mt-3 font-medium text-slate-900">{c.title}</div>
                <div className="mt-2 h-2 w-full rounded-full bg-slate-100">
                  <div className="h-2 rounded-full bg-brand-600" style={{ width: `${c.progressPct}%` }} />
                </div>
                <div className="mt-1 text-xs text-slate-500">{c.progressPct}% complete</div>
              </Link>
              <Link
                to={c.lastLessonId ? `/learn/${c.id}?lesson=${c.lastLessonId}` : `/learn/${c.id}`}
                className="mt-3 block rounded-full bg-brand-600 px-4 py-2 text-center text-sm font-medium text-white hover:bg-brand-700"
              >
                {c.progressPct > 0 ? "Continue Learning" : "Start Learning"}
              </Link>
            </div>
          ))}
        </div>
      )}

      <h2 className="mt-12 text-lg font-semibold text-slate-900">Payment History</h2>
      <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="px-4 py-3">Course</th>
              <th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Date</th>
            </tr>
          </thead>
          <tbody>
            {payments.map((p) => (
              <tr key={p.id} className="border-t border-slate-100">
                <td className="px-4 py-3">{p.courses?.title ?? "—"}</td>
                <td className="px-4 py-3">{p.currency} {p.amount}</td>
                <td className="px-4 py-3 capitalize">{p.status}</td>
                <td className="px-4 py-3">{new Date(p.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
            {payments.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-slate-400">No payments yet</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
