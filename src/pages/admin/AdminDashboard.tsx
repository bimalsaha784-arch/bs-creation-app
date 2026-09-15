import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";

interface Stats {
  totalStudents: number;
  totalCourses: number;
  publishedCourses: number;
  totalOrders: number;
  successfulPayments: number;
  failedPayments: number;
  activeEnrollments: number;
  revenue: number;
}

export function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    (async () => {
      const [
        students,
        courses,
        published,
        orders,
        successPayments,
        failedPayments,
        enrollments,
        revenueRows,
      ] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "student"),
        supabase.from("courses").select("id", { count: "exact", head: true }),
        supabase.from("courses").select("id", { count: "exact", head: true }).eq("status", "published"),
        supabase.from("orders").select("id", { count: "exact", head: true }),
        supabase.from("payments").select("id", { count: "exact", head: true }).eq("status", "captured"),
        supabase.from("payments").select("id", { count: "exact", head: true }).eq("status", "failed"),
        supabase.from("enrollments").select("id", { count: "exact", head: true }).eq("status", "active"),
        supabase.from("payments").select("amount").eq("status", "captured"),
      ]);

      const revenue = (revenueRows.data ?? []).reduce((sum, r: any) => sum + Number(r.amount), 0);

      setStats({
        totalStudents: students.count ?? 0,
        totalCourses: courses.count ?? 0,
        publishedCourses: published.count ?? 0,
        totalOrders: orders.count ?? 0,
        successfulPayments: successPayments.count ?? 0,
        failedPayments: failedPayments.count ?? 0,
        activeEnrollments: enrollments.count ?? 0,
        revenue,
      });
    })();
  }, []);

  const cards = stats
    ? [
        { label: "Total Students", value: stats.totalStudents },
        { label: "Total Courses", value: stats.totalCourses },
        { label: "Published Courses", value: stats.publishedCourses },
        { label: "Total Orders", value: stats.totalOrders },
        { label: "Successful Payments", value: stats.successfulPayments },
        { label: "Failed Payments", value: stats.failedPayments },
        { label: "Active Enrollments", value: stats.activeEnrollments },
        { label: "Revenue", value: `₹${stats.revenue}` },
      ]
    : [];

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Admin Dashboard</h1>
        <div className="flex gap-2">
          <Link to="/admin/courses" className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium hover:bg-slate-50">
            Manage Courses
          </Link>
          <Link to="/admin/courses/create" className="rounded-full bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700">
            + New Course
          </Link>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="rounded-2xl border border-slate-200 p-5">
            <div className="text-sm text-slate-500">{c.label}</div>
            <div className="mt-2 text-2xl font-bold text-slate-900">{c.value}</div>
          </div>
        ))}
      </div>

      <p className="mt-10 text-sm text-slate-500">
        This dashboard reads live data straight from Supabase using your admin session — protected by
        the <code>is_admin()</code> RLS check on every table, so a non-admin account cannot see this
        data even by calling the same queries directly.
      </p>
    </div>
  );
}
