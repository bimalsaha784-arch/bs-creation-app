import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import type { Course } from "../../types";

export function AdminCourses() {
  const [courses, setCourses] = useState<Course[]>([]);

  useEffect(() => {
    supabase
      .from("courses")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data }) => setCourses((data as Course[]) ?? []));
  }, []);

  async function togglePublish(course: Course) {
    const next = course.status === "published" ? "draft" : "published";
    await supabase.from("courses").update({ status: next }).eq("id", course.id);
    setCourses((prev) => prev.map((c) => (c.id === course.id ? { ...c, status: next } : c)));
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Courses</h1>
        <Link to="/admin/courses/create" className="rounded-full bg-brand-600 px-4 py-2 text-sm font-medium text-white">
          + New Course
        </Link>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="px-4 py-3">Title</th>
              <th className="px-4 py-3">Price</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {courses.map((c) => (
              <tr key={c.id} className="border-t border-slate-100">
                <td className="px-4 py-3 font-medium text-slate-900">{c.title}</td>
                <td className="px-4 py-3">{c.currency} {c.discount_price ?? c.price}</td>
                <td className="px-4 py-3 capitalize">{c.status}</td>
                <td className="px-4 py-3">
                  <Link to={`/admin/courses/${c.id}/edit`} className="mr-3 text-brand-600 hover:underline">
                    Edit
                  </Link>
                  <button onClick={() => togglePublish(c)} className="text-slate-600 hover:underline">
                    {c.status === "published" ? "Unpublish" : "Publish"}
                  </button>
                </td>
              </tr>
            ))}
            {courses.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-slate-400">No courses yet</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
