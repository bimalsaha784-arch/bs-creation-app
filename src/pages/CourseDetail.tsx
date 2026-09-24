import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../hooks/useAuth";
import { useCheckout } from "../hooks/useCheckout";
import { CourseCard } from "../components/CourseCard";
import { CourseThumb } from "../components/CourseThumb";
import { Logo } from "../components/Logo";
import { computeStats, fetchOwnedCourseIds, fetchPublishedCourses, type CatalogCourse } from "../lib/catalog";
import { discountPct, effectivePrice, formatPrice } from "../lib/format";
import { IconCheckCircle, IconChevronDown, IconLock, IconShield } from "../components/Icons";
import { lessonIcon } from "../components/lessonIcon";
import type { Course, Module, Lesson } from "../types";

export function CourseDetail() {
  const { courseSlug } = useParams();
  const { session, user } = useAuth();
  const navigate = useNavigate();

  const [course, setCourse] = useState<Course | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [modules, setModules] = useState<(Module & { lessons: Lesson[] })[]>([]);
  const [owned, setOwned] = useState(false);
  const [others, setOthers] = useState<CatalogCourse[]>([]);
  const [otherOwned, setOtherOwned] = useState<Set<string>>(new Set());
  const [openModules, setOpenModules] = useState<Set<string>>(new Set());

  const { buy, buyingId, error, statusMsg } = useCheckout({ onPurchased: () => setOwned(true) });
  const buying = !!course && buyingId === course.id;

  useEffect(() => {
    (async () => {
      setNotFound(false);
      setCourse(null);
      setOwned(false);
      const { data: courseData } = await supabase
        .from("courses")
        .select("*")
        .eq("slug", courseSlug)
        .eq("status", "published")
        .single();
      if (!courseData) {
        setNotFound(true);
        return;
      }
      setCourse(courseData as Course);

      const { data: moduleData } = await supabase
        .from("modules")
        .select("*, lessons(*)")
        .eq("course_id", courseData.id)
        .order("position");
      const mods = ((moduleData as any) ?? []) as (Module & { lessons: Lesson[] })[];
      setModules(mods);
      if (mods[0]) setOpenModules(new Set([mods[0].id]));

      if (user) {
        const { data: enrollment } = await supabase
          .from("enrollments")
          .select("id")
          .eq("user_id", user.id)
          .eq("course_id", courseData.id)
          .eq("status", "active")
          .maybeSingle();
        setOwned(!!enrollment);
      } else {
        setOwned(false);
      }

      // Other courses for "Explore more courses"
      const [catalog, ownedSet] = await Promise.all([
        fetchPublishedCourses(),
        user ? fetchOwnedCourseIds(user.id) : Promise.resolve(new Set<string>()),
      ]);
      const rest = catalog.filter((c) => c.id !== courseData.id);
      rest.sort((a, b) => Number(ownedSet.has(a.id)) - Number(ownedSet.has(b.id))); // not-owned first
      setOthers(rest.slice(0, 3));
      setOtherOwned(ownedSet);
    })();
  }, [courseSlug, user?.id]);

  // Reserve space at the bottom of the page for the mobile "Buy now" bar
  const showBuyBar = !!course && !owned;
  useEffect(() => {
    document.body.classList.toggle("has-buybar", showBuyBar);
    return () => document.body.classList.remove("has-buybar");
  }, [showBuyBar]);

  if (notFound) {
    return (
      <div className="page py-20 text-center">
        <h1 className="font-display text-2xl font-bold">This course isn't available</h1>
        <p className="mt-2 text-ink/65">It may have been renamed or removed.</p>
        <Link to="/courses" className="btn-primary mt-6">View all courses</Link>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="page py-12">
        <div className="h-8 w-2/3 animate-pulse rounded bg-brand-50" />
        <div className="mt-4 h-4 w-1/2 animate-pulse rounded bg-brand-50" />
        <div className="mt-10 h-64 animate-pulse rounded-2xl bg-brand-50" />
      </div>
    );
  }

  const stats = computeStats(modules as any);
  const pct = discountPct(course);
  const price = effectivePrice(course);
  const meta = [
    course.instructor_name && { k: "Instructor", v: course.instructor_name },
    course.duration && { k: "Duration", v: course.duration },
    course.level && { k: "Level", v: course.level },
    course.language && { k: "Language", v: course.language },
  ].filter(Boolean) as { k: string; v: string }[];

  const included = [
    stats.subjects.length > 0 && `${stats.subjects.length} ${stats.subjects.length === 1 ? "subject" : "subjects"}`,
    stats.notes > 0 && `${stats.notes} reading ${stats.notes === 1 ? "material" : "materials"}`,
    stats.practice > 0 && `${stats.practice} practice ${stats.practice === 1 ? "set" : "sets"}`,
    stats.mocks > 0 && `${stats.mocks} mock ${stats.mocks === 1 ? "test" : "tests"}`,
    stats.videos > 0 && `${stats.videos} ${stats.videos === 1 ? "video" : "videos"}`,
    "Access from phone or laptop",
  ].filter(Boolean) as string[];

  function toggleModule(id: string) {
    setOpenModules((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  const purchaseBox = (
    <div className="overflow-hidden rounded-2xl border border-line bg-white shadow-card">
      <div className="aspect-[16/9] overflow-hidden bg-brand-50">
        <CourseThumb course={course} />
      </div>
      <div className="p-5 sm:p-6">
        {owned ? (
          <>
            <p className="flex items-center gap-2 rounded-xl bg-brand-50 px-3.5 py-3 text-sm font-semibold text-brand-700">
              <IconCheckCircle width={20} height={20} /> Purchased — this course is in your account
            </p>
            <button onClick={() => navigate(`/learn/${course.id}`)} className="btn-primary mt-4 h-12 w-full text-base">
              Access course
            </button>
            <Link to="/dashboard" className="btn-ghost mt-2 w-full">Back to dashboard</Link>
          </>
        ) : (
          <>
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="font-display text-3xl font-extrabold">{formatPrice(price, course.currency)}</span>
              {pct > 0 && (
                <>
                  <span className="text-ink/40 line-through">{formatPrice(course.price, course.currency)}</span>
                  <span className="rounded-md bg-marigold-50 px-2 py-0.5 text-sm font-bold text-marigold-600">{pct}% off</span>
                </>
              )}
            </div>
            <button onClick={() => buy(course)} disabled={buying} className="btn-primary mt-5 h-12 w-full text-base">
              {buying ? "Starting checkout…" : "Buy now"}
            </button>
            {!session && <p className="mt-2 text-center text-xs text-ink/50">You'll be asked to log in first.</p>}
          </>
        )}

        {statusMsg && <p className="mt-3 rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-800" role="status">{statusMsg}</p>}
        {error && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{error}</p>}

        <div className="mt-5 border-t border-line pt-5">
          <div className="text-sm font-semibold">This course includes</div>
          <ul className="mt-3 space-y-2 text-sm text-ink/75">
            {included.map((t) => (
              <li key={t} className="flex items-center gap-2">
                <IconCheckCircle width={16} height={16} className="shrink-0 text-brand-500" /> {t}
              </li>
            ))}
          </ul>
        </div>

        {!owned && (
          <div className="mt-5 flex items-center justify-between gap-3 border-t border-line pt-4 text-xs text-ink/55">
            <span className="inline-flex items-center gap-1.5">
              <IconShield width={16} height={16} className="text-brand-500" /> Secure checkout via Razorpay
            </span>
            <Logo size="sm" to={null} showWordmark={false} />
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div>
      {/* Header */}
      <section className="border-b border-line bg-white">
        <div className="page py-8 sm:py-10">
          <nav className="text-sm text-ink/55" aria-label="Breadcrumb">
            <Link to="/courses" className="hover:text-brand-700">Courses</Link>
            <span className="mx-2">/</span>
            <span className="text-ink/80">{course.title}</span>
          </nav>
          <h1 className="mt-3 max-w-3xl font-display text-3xl font-extrabold leading-tight sm:text-[40px]">{course.title}</h1>
          {course.short_description && <p className="mt-3 max-w-2xl text-lg text-ink/70">{course.short_description}</p>}
          {meta.length > 0 && (
            <dl className="mt-6 flex flex-wrap gap-x-8 gap-y-3">
              {meta.map((m) => (
                <div key={m.k}>
                  <dt className="text-xs text-ink/50">{m.k}</dt>
                  <dd className="text-sm font-semibold">{m.v}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      </section>

      <div className="page grid gap-8 py-8 sm:py-10 lg:grid-cols-[1fr_360px] lg:gap-10">
        {/* Purchase box — first on mobile, sticky sidebar on desktop */}
        <aside className="lg:order-2">
          <div className="lg:sticky lg:top-24">{purchaseBox}</div>
        </aside>

        <div className="min-w-0 lg:order-1">
          {course.description && (
            <section>
              <h2 className="text-xl font-bold">About this course</h2>
              <p className="mt-3 whitespace-pre-line leading-relaxed text-ink/75">{course.description}</p>
            </section>
          )}

          <section className={course.description ? "mt-10" : ""}>
            <div className="flex items-end justify-between gap-4">
              <h2 className="text-xl font-bold">Course content</h2>
              <span className="text-sm text-ink/50">
                {modules.length} {modules.length === 1 ? "subject" : "subjects"}, {stats.lessons} {stats.lessons === 1 ? "lesson" : "lessons"}
              </span>
            </div>
            {modules.length === 0 ? (
              <p className="mt-4 rounded-xl border border-dashed border-line bg-white p-6 text-ink/60">Content for this course is being added.</p>
            ) : (
              <div className="mt-4 divide-y divide-line overflow-hidden rounded-2xl border border-line bg-white">
                {modules.map((m) => {
                  const open = openModules.has(m.id);
                  const lessons = [...(m.lessons ?? [])].sort((a, b) => a.position - b.position);
                  return (
                    <div key={m.id}>
                      <button
                        onClick={() => toggleModule(m.id)}
                        aria-expanded={open}
                        className="flex min-h-[56px] w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-paper sm:px-5"
                      >
                        <span className="font-semibold">{m.title}</span>
                        <span className="flex shrink-0 items-center gap-2 text-sm text-ink/50">
                          {lessons.length}
                          <IconChevronDown width={18} height={18} className={`transition-transform ${open ? "rotate-180" : ""}`} />
                        </span>
                      </button>
                      {open && (
                        <ul className="border-t border-line bg-paper/60 px-4 py-2 sm:px-5">
                          {lessons.map((l) => {
                            const Icon = lessonIcon(l);
                            return (
                              <li key={l.id} className="flex items-center gap-3 py-2 text-[15px] text-ink/75">
                                <Icon width={17} height={17} className="shrink-0 text-brand-500" />
                                <span className="flex-1">{l.title}</span>
                                {!owned && <IconLock width={15} height={15} className="shrink-0 text-ink/30" aria-label="Locked" />}
                              </li>
                            );
                          })}
                          {lessons.length === 0 && <li className="py-2 text-sm text-ink/50">Lessons coming soon.</li>}
                        </ul>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </div>

      {/* Explore more courses */}
      {others.length > 0 && (
        <section className="border-t border-line bg-white">
          <div className="page py-12">
            <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
              <h2 className="section-title">Explore more courses</h2>
              <Link to="/courses" className="btn-secondary">View all courses</Link>
            </div>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {others.map((c) => (
                <CourseCard key={c.id} course={c} stats={c.stats} owned={otherOwned.has(c.id)} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Mobile sticky buy bar */}
      {!owned && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white/95 px-4 py-3 backdrop-blur lg:hidden">
          <div className="mx-auto flex max-w-xl items-center gap-4">
            <div className="min-w-0 flex-1">
              <div className="font-display text-xl font-extrabold">{formatPrice(price, course.currency)}</div>
              {pct > 0 && <div className="text-xs text-ink/50"><span className="line-through">{formatPrice(course.price, course.currency)}</span> {pct}% off</div>}
            </div>
            <button onClick={() => buy(course)} disabled={buying} className="btn-primary h-12 flex-1 text-base">
              {buying ? "Starting…" : "Buy now"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
