import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../hooks/useAuth";
import { useCheckout } from "../hooks/useCheckout";
import { CheckoutNotice } from "../components/CheckoutNotice";
import { CourseCard, CourseCardSkeleton } from "../components/CourseCard";
import { CourseThumb } from "../components/CourseThumb";
import { fetchPublishedCourses, type CatalogCourse } from "../lib/catalog";
import { firstName } from "../lib/format";
import { IconCheckCircle } from "../components/Icons";
import type { Course } from "../types";

interface OwnedCourse extends Course {
  progressPct: number;
  lastLessonId: string | null;
}

/**
 * Student dashboard.
 *  - MY COURSES: every course with an active enrollment (unchanged access logic)
 *  - EXPLORE MORE COURSES: every published course the student does NOT own yet
 * A purchased course is never the only thing a student sees.
 */
export function Dashboard() {
  const { user, profile } = useAuth();
  const location = useLocation() as { key: string; state?: { justPurchased?: string } };
  const [courses, setCourses] = useState<OwnedCourse[]>([]);
  const [explore, setExplore] = useState<CatalogCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const checkout = useCheckout();

  useEffect(() => {
    if (!user) return;
    (async () => {
      // Same enrollment query as before — this is what grants course access.
      const [{ data: enrollments }, catalog] = await Promise.all([
        supabase
          .from("enrollments")
          .select("course_id, courses(*)")
          .eq("user_id", user.id)
          .eq("status", "active"),
        fetchPublishedCourses(),
      ]);

      const ownedIds = new Set<string>((enrollments ?? []).map((e: any) => e.course_id));

      // Progress per course (same queries as before, now run in parallel).
      const owned = await Promise.all(
        (enrollments ?? [])
          .map((e: any) => e.courses as Course | null)
          .filter((c): c is Course => !!c)
          .map(async (course): Promise<OwnedCourse> => {
            const [{ count: totalLessons }, { count: completedLessons }, { data: lastProgress }] = await Promise.all([
              supabase
                .from("lessons")
                .select("id, modules!inner(course_id)", { count: "exact", head: true })
                .eq("modules.course_id", course.id),
              supabase
                .from("progress")
                .select("id", { count: "exact", head: true })
                .eq("user_id", user.id)
                .eq("course_id", course.id)
                .eq("completed", true),
              supabase
                .from("progress")
                .select("lesson_id, last_accessed_at")
                .eq("user_id", user.id)
                .eq("course_id", course.id)
                .order("last_accessed_at", { ascending: false })
                .limit(1)
                .maybeSingle(),
            ]);
            const pct = totalLessons ? Math.round(((completedLessons ?? 0) / totalLessons) * 100) : 0;
            return { ...course, progressPct: Math.min(pct, 100), lastLessonId: lastProgress?.lesson_id ?? null };
          })
      );

      setCourses(owned);
      setExplore(catalog.filter((c) => !ownedIds.has(c.id)));
      setLoading(false);
    })();
    // location.key → refresh after a purchase redirects back here
  }, [user?.id, location.key]);

  const name = firstName(profile?.full_name);
  const justPurchased = location.state?.justPurchased;
  const inProgress = courses.filter((c) => c.progressPct > 0 && c.progressPct < 100).length;

  return (
    <div>
      {/* Welcome */}
      <section className="border-b border-line bg-white">
        <div className="page flex flex-col gap-6 py-8 sm:py-10 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="font-display text-3xl font-extrabold sm:text-4xl">Welcome back{name ? `, ${name}` : ""}!</h1>
            <p className="mt-2 text-ink/65">
              {loading
                ? "Loading your courses…"
                : courses.length === 0
                ? "You haven't unlocked a course yet. Pick one below to get started."
                : `You have ${courses.length} ${courses.length === 1 ? "course" : "courses"} in your library${
                    inProgress ? `, ${inProgress} in progress` : ""
                  }.`}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={scrollToExplore} className="btn-secondary">Explore more courses</button>
            <Link to="/profile" className="btn-ghost">Payments & profile</Link>
          </div>
        </div>
      </section>

      <div className="page space-y-14 py-10 sm:py-12">
        {justPurchased && (
          <div className="flex items-start gap-3 rounded-2xl border border-brand-200 bg-brand-50 p-4 text-brand-800" role="status">
            <IconCheckCircle width={22} height={22} className="mt-0.5 shrink-0" />
            <p className="text-[15px]">Payment successful. Your new course is now in <strong>My Courses</strong>, alongside everything you already own.</p>
          </div>
        )}

        {/* MY COURSES */}
        <section id="my-courses" className="scroll-mt-24">
          <div className="mb-5 flex items-end justify-between gap-4">
            <h2 className="section-title">My courses</h2>
            {courses.length > 0 && <span className="text-sm text-ink/50">{courses.length} purchased</span>}
          </div>

          {loading ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {[0, 1, 2].map((i) => <CourseCardSkeleton key={i} />)}
            </div>
          ) : courses.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-brand-200 bg-white p-8 text-center sm:p-10">
              <h3 className="text-lg font-bold">Your purchased courses will appear here</h3>
              <p className="mx-auto mt-2 max-w-md text-ink/65">
                Every course you buy stays in this list. Browse the courses below to see what's inside each one.
              </p>
              <button type="button" onClick={scrollToExplore} className="btn-primary mt-5">Browse courses</button>
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {courses.map((c) => (
                <MyCourseCard key={c.id} course={c} highlight={c.id === justPurchased} />
              ))}
            </div>
          )}
        </section>

        {/* EXPLORE MORE COURSES */}
        <section id="explore" className="scroll-mt-24">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="section-title">Explore more courses</h2>
              <p className="mt-1.5 text-ink/65">Add another course to your account. Your current courses stay exactly as they are.</p>
            </div>
            <Link to="/courses" className="btn-secondary">View all courses</Link>
          </div>

          {loading ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {[0, 1, 2].map((i) => <CourseCardSkeleton key={i} />)}
            </div>
          ) : explore.length === 0 ? (
            <div className="rounded-2xl border border-line bg-white p-8 text-center">
              <h3 className="text-lg font-bold">You own every course on BS Creation</h3>
              <p className="mt-2 text-ink/65">New courses will show up here as soon as they're published.</p>
              <Link to="/courses" className="btn-secondary mt-5">View all courses</Link>
            </div>
          ) : (
            <>
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {explore.map((c) => (
                  <CourseCard
                    key={c.id}
                    course={c}
                    stats={c.stats}
                    onBuy={checkout.buy}
                    buying={checkout.buyingId === c.id}
                  />
                ))}
              </div>
            </>
          )}
        </section>
      </div>
      <CheckoutNotice error={checkout.error} status={checkout.statusMsg} />
    </div>
  );
}

function scrollToExplore() {
  document.getElementById("explore")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function MyCourseCard({ course: c, highlight }: { course: OwnedCourse; highlight?: boolean }) {
  const continueTo = c.lastLessonId ? `/learn/${c.id}?lesson=${c.lastLessonId}` : `/learn/${c.id}`;
  const done = c.progressPct >= 100;
  return (
    <article
      className={`flex h-full flex-col overflow-hidden rounded-2xl border bg-white shadow-card ${
        highlight ? "border-brand-400 ring-2 ring-brand-100" : "border-line"
      }`}
    >
      <Link to={`/learn/${c.id}`} className="relative block aspect-[16/9] overflow-hidden bg-brand-50" tabIndex={-1}>
        <CourseThumb course={c} />
        <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-lg bg-white/95 px-2.5 py-1 text-xs font-semibold text-brand-700 shadow-sm">
          <IconCheckCircle width={14} height={14} /> {highlight ? "Just unlocked" : "Purchased"}
        </span>
      </Link>
      <div className="flex flex-1 flex-col p-4 sm:p-5">
        <h3 className="line-clamp-2 min-h-[2.6em] text-[17px] font-bold leading-snug">
          <Link to={`/learn/${c.id}`} className="hover:text-brand-700">{c.title}</Link>
        </h3>

        <div className="mt-3">
          <div className="flex items-center justify-between text-xs font-medium text-ink/60">
            <span>{done ? "Completed" : c.progressPct > 0 ? "In progress" : "Not started"}</span>
            <span>{c.progressPct}%</span>
          </div>
          <div
            className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-brand-50"
            role="progressbar"
            aria-valuenow={c.progressPct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`${c.title} progress`}
          >
            <div className={`h-full rounded-full ${done ? "bg-marigold-400" : "bg-brand-500"}`} style={{ width: `${c.progressPct}%` }} />
          </div>
        </div>

        <div className="mt-auto grid grid-cols-2 gap-2 pt-5">
          <Link to={continueTo} className="btn-primary btn-sm">
            {c.progressPct > 0 ? "Continue learning" : "Start learning"}
          </Link>
          <Link to={`/learn/${c.id}`} className="btn-secondary btn-sm">
            Access course
          </Link>
        </div>
      </div>
    </article>
  );
}
