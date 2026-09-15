import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { CourseCard } from "../components/CourseCard";
import type { Course } from "../types";

export function Home() {
  const [featured, setFeatured] = useState<Course[]>([]);

  useEffect(() => {
    supabase
      .from("courses")
      .select("*")
      .eq("status", "published")
      .order("created_at", { ascending: false })
      .limit(6)
      .then(({ data }) => setFeatured((data as Course[]) ?? []));
  }, []);

  return (
    <div>
      {/* Hero */}
      <section className="bg-gradient-to-b from-brand-50 to-white">
        <div className="mx-auto max-w-6xl px-4 py-20 text-center">
          <h1 className="mx-auto max-w-3xl text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">
            Learn. Create. <span className="text-brand-600">Grow</span> with BS Creation.
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-lg text-slate-600">
            Practical, structured courses built by real instructors — designed to help you build
            skills you can actually use.
          </p>
          <div className="mt-8 flex justify-center gap-3">
            <Link
              to="/courses"
              className="rounded-full bg-brand-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-600/20 transition hover:bg-brand-700"
            >
              Browse Courses
            </Link>
            <Link
              to="/register"
              className="rounded-full border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Create Account
            </Link>
          </div>
        </div>
      </section>

      {/* Featured courses */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="mb-8 flex items-end justify-between">
          <h2 className="text-2xl font-bold text-slate-900">Featured Courses</h2>
          <Link to="/courses" className="text-sm font-medium text-brand-600 hover:underline">
            View all →
          </Link>
        </div>
        {featured.length === 0 ? (
          <p className="text-slate-500">New courses are on their way — check back soon.</p>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((c) => (
              <CourseCard key={c.id} course={c} />
            ))}
          </div>
        )}
      </section>

      {/* Why BS Creation */}
      <section className="bg-slate-50 py-16">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 sm:grid-cols-3">
          {[
            { title: "Structured Learning", body: "Courses broken into modules and lessons you can follow at your own pace." },
            { title: "Real Instructors", body: "Content created by people who actually do the work, not generic filler." },
            { title: "Learn Anywhere", body: "A course player that works well on your phone, tablet, or laptop." },
          ].map((item) => (
            <div key={item.title} className="rounded-2xl bg-white p-6 shadow-sm">
              <h3 className="font-semibold text-slate-900">{item.title}</h3>
              <p className="mt-2 text-sm text-slate-500">{item.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="mx-auto max-w-4xl px-4 py-20 text-center">
        <h2 className="text-2xl font-bold text-slate-900">Ready to start learning?</h2>
        <p className="mt-2 text-slate-500">Create your free account and browse the course catalog today.</p>
        <Link
          to="/register"
          className="mt-6 inline-block rounded-full bg-brand-600 px-6 py-3 text-sm font-semibold text-white hover:bg-brand-700"
        >
          Get Started Free
        </Link>
      </section>
    </div>
  );
}
