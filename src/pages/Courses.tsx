import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { CourseCard } from "../components/CourseCard";
import { useAuth } from "../hooks/useAuth";
import type { Course } from "../types";

export function Courses() {
  const { user } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [ownedIds, setOwnedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("courses")
        .select("*")
        .eq("status", "published")
        .order("created_at", { ascending: false });
      setCourses((data as Course[]) ?? []);

      if (user) {
        const { data: enrollments } = await supabase
          .from("enrollments")
          .select("course_id")
          .eq("user_id", user.id)
          .eq("status", "active");
        setOwnedIds(new Set((enrollments ?? []).map((e: any) => e.course_id)));
      }
      setLoading(false);
    })();
  }, [user?.id]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="text-3xl font-bold text-slate-900">All Courses</h1>
      <p className="mt-2 text-slate-500">Browse everything BS Creation currently offers.</p>

      {loading ? (
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-64 animate-pulse rounded-2xl bg-slate-100" />
          ))}
        </div>
      ) : courses.length === 0 ? (
        <p className="mt-10 text-slate-500">No courses published yet.</p>
      ) : (
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((c) => (
            <CourseCard key={c.id} course={c} owned={ownedIds.has(c.id)} />
          ))}
        </div>
      )}
    </div>
  );
}
