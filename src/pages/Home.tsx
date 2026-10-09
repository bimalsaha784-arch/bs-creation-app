import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useCheckout } from "../hooks/useCheckout";
import { CheckoutNotice } from "../components/CheckoutNotice";
import { LoadError } from "../components/LoadError";
import { CourseCard, CourseCardSkeleton } from "../components/CourseCard";
import { HeroScene } from "../components/Hero3D";
import { fetchOwnedCourseIds, fetchPublishedCourses, type CatalogCourse } from "../lib/catalog";
import {
  IconCheck, IconDoc, IconPencil, IconTimer, IconPhone, IconLayers, IconShield, IconChart, IconSearch,
} from "../components/Icons";

export function Home() {
  const { session, user } = useAuth();
  const [featured, setFeatured] = useState<CatalogCourse[]>([]);
  const [ownedIds, setOwnedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const checkout = useCheckout();

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      setLoadError(false);
      try {
        const courses = await fetchPublishedCourses(6);
        const owned = user ? await fetchOwnedCourseIds(user.id) : new Set<string>();
        if (!active) return;
        setFeatured(courses);
        setOwnedIds(owned);
      } catch (err) {
        console.error("Home: could not load courses:", err);
        if (active) setLoadError(true);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [user?.id, attempt]);

  return (
    <div>
      <Hero loggedIn={!!session} courses={featured} />
      <FeatureStrip />

      {/* Courses */}
      <section id="courses" className="page py-12 sm:py-16">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="section-title">Featured courses</h2>
            <p className="mt-2 max-w-xl text-ink/65">Each course has its own notes, practice sets and mock tests. Buy one, or several — they all stay in your account.</p>
          </div>
          <Link to="/courses" className="btn-secondary">View all courses</Link>
        </div>
        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
            {[0, 1, 2].map((i) => <CourseCardSkeleton key={i} />)}
          </div>
        ) : loadError ? (
          <LoadError onRetry={() => setAttempt((n) => n + 1)} />
        ) : featured.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-line bg-white p-8 text-center text-ink/60">New courses are being added. Check back soon.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
            {featured.map((c) => (
              <CourseCard
                key={c.id}
                course={c}
                stats={c.stats}
                owned={ownedIds.has(c.id)}
                onBuy={checkout.buy}
                buying={checkout.buyingId === c.id}
              />
            ))}
          </div>
        )}
      </section>

      <WhySection />
      <TrustStrip />

      {/* Final CTA */}
      <section className="page pb-14 sm:pb-20">
        <div className="flex flex-col items-start justify-between gap-6 rounded-3xl bg-marigold-50 p-8 ring-1 ring-marigold-100 sm:p-12 md:flex-row md:items-center">
          <div>
            <h2 className="font-display text-2xl font-bold sm:text-3xl">Your exam date isn't moving. Start today.</h2>
            <p className="mt-2 text-ink/70">Browse the courses and see exactly what's inside each one.</p>
          </div>
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
            <Link to="/courses" className="btn-primary">Explore courses</Link>
            {!session && <Link to="/register" className="btn-secondary">Create free account</Link>}
          </div>
        </div>
      </section>
      <CheckoutNotice error={checkout.error} status={checkout.statusMsg} />
    </div>
  );
}

function Hero({ loggedIn, courses }: { loggedIn: boolean; courses: CatalogCourse[] }) {
  const navigate = useNavigate();
  const [q, setQ] = useState("");

  function onSearch(e: FormEvent) {
    e.preventDefault();
    const t = q.trim();
    navigate(t ? `/courses?q=${encodeURIComponent(t)}` : "/courses");
  }

  // Quick filters come from the real courses, so they never lead to an empty page.
  const chips = courses.slice(0, 5);

  return (
    <section className="hero-navy relative overflow-hidden text-white">
      <div className="hero-dots" aria-hidden="true" />
      <div className="page relative grid items-center gap-6 pb-24 pt-10 sm:pt-14 lg:grid-cols-[1.05fr_1fr] lg:gap-4 lg:pb-32 lg:pt-16">
        <div>
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm font-medium text-white/80">
            <span>Notes</span>
            <span className="h-3 w-px bg-white/30" aria-hidden="true" />
            <span>Practice</span>
            <span className="h-3 w-px bg-white/30" aria-hidden="true" />
            <span>Mock tests</span>
          </p>
          <h1 className="mt-4 font-display text-[40px] font-extrabold leading-[1.04] text-white sm:text-5xl lg:text-[60px]">
            Your Learning Journey <span className="block text-marigold-400">Starts Here</span>
          </h1>
          <p className="mt-5 max-w-lg text-[17px] leading-relaxed text-white/75">
            Chapter-wise reading material, topic-wise practice questions and timed mock tests, arranged subject by subject. Study on your phone or laptop.
          </p>

          <form onSubmit={onSearch} role="search" className="mt-7 flex max-w-xl items-center gap-2 rounded-2xl bg-white p-1.5 shadow-deep">
            <IconSearch width={20} height={20} className="ml-3 shrink-0 text-brand-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search courses or subjects…"
              aria-label="Search courses"
              className="h-11 min-w-0 flex-1 bg-transparent px-1 text-[15px] text-ink placeholder:text-ink/40 focus:outline-none"
            />
            <button type="submit" className="btn-accent !min-h-[44px] !px-4" aria-label="Search">
              <IconSearch width={18} height={18} />
            </button>
          </form>

          <div className="mt-4 flex flex-wrap gap-2">
            <Link to="/courses" className="rounded-full border border-white/25 bg-white/10 px-3.5 py-1.5 text-[13px] font-medium text-white hover:bg-white/20">
              All courses
            </Link>
            {chips.map((c) => (
              <Link
                key={c.id}
                to={`/courses?q=${encodeURIComponent(c.title)}`}
                className="max-w-[12rem] truncate rounded-full border border-white/25 bg-white/10 px-3.5 py-1.5 text-[13px] font-medium text-white hover:bg-white/20"
              >
                {c.title}
              </Link>
            ))}
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link to="/courses" className="btn-accent h-12 px-6 text-base">Explore courses</Link>
            {loggedIn ? (
              <Link to="/dashboard" className="btn-glass h-12 px-6 text-base">Go to my dashboard</Link>
            ) : (
              <Link to="/register" className="btn-glass h-12 px-6 text-base">Create free account</Link>
            )}
          </div>
        </div>

        <HeroScene />
      </div>
    </section>
  );
}

/** Raised white card that overlaps the hero. Everything listed here exists in every course. */
function FeatureStrip() {
  const items = [
    { icon: IconDoc, title: "Reading material", body: "Chapter-wise PDF notes" },
    { icon: IconPencil, title: "Practice questions", body: "Topic-wise question sets" },
    { icon: IconTimer, title: "Mock tests", body: "Timed, exam-style tests" },
    { icon: IconChart, title: "Progress tracking", body: "Resume where you stopped" },
    { icon: IconShield, title: "Secure payments", body: "UPI, cards, net banking" },
  ];
  return (
    <div className="page relative z-10 -mt-14 sm:-mt-16">
      <ul className="grid grid-cols-2 gap-x-4 gap-y-5 rounded-3xl bg-white p-5 shadow-lift ring-1 ring-line sm:grid-cols-3 sm:p-6 lg:grid-cols-5">
        {items.map(({ icon: Icon, title, body }, i) => (
          <li key={title} className={`flex items-center gap-3 ${i === 4 ? "col-span-2 sm:col-span-1" : ""}`}>
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600 shadow-[inset_0_-3px_0_rgba(23,58,128,0.12)]">
              <Icon width={22} height={22} />
            </span>
            <span className="min-w-0">
              <span className="block text-[14px] font-bold leading-tight text-ink">{title}</span>
              <span className="mt-0.5 block text-[12px] leading-snug text-ink/55">{body}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function WhySection() {
  const points = [
    { icon: IconLayers, title: "Organised by subject", body: "Every course is split into subjects and chapters, so you always know what to study next." },
    { icon: IconChart, title: "Progress you can see", body: "Mark lessons complete and pick up exactly where you left off from your dashboard." },
    { icon: IconPhone, title: "Made for your phone", body: "Notes, practice and tests all work on a mobile screen. No app to install." },
    { icon: IconShield, title: "Secure payments", body: "Pay with UPI, cards or net banking through Razorpay. Access unlocks right after payment." },
  ];
  const steps = [
    { t: "Create your account", b: "Sign up with email or Google. It's free." },
    { t: "Pick a course", b: "See subjects, notes, practice sets and mock tests before you buy." },
    { t: "Pay securely", b: "Checkout through Razorpay. The course unlocks immediately." },
    { t: "Start studying", b: "Open it from My Courses any time. Come back for more later." },
  ];
  return (
    <section className="page grid gap-5 pb-12 sm:pb-16 lg:grid-cols-[1.5fr_1fr]">
      <div className="hero-navy relative overflow-hidden rounded-3xl p-6 text-white shadow-deep sm:p-9">
        <div className="hero-dots" aria-hidden="true" />
        <div className="relative">
          <h2 className="font-display text-2xl font-bold text-white sm:text-3xl">Why choose BS Creation?</h2>
          <p className="mt-2 text-white/70">One account for all your preparation.</p>
          <ul className="mt-7 grid gap-6 sm:grid-cols-2">
            {points.map(({ icon: Icon, title, body }) => (
              <li key={title} className="flex gap-3.5">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/10 text-marigold-300 ring-1 ring-white/15">
                  <Icon width={22} height={22} />
                </span>
                <div>
                  <h3 className="text-[15px] font-bold text-white">{title}</h3>
                  <p className="mt-1 text-[14px] leading-relaxed text-white/70">{body}</p>
                </div>
              </li>
            ))}
          </ul>
          <Link to="/courses" className="btn-accent mt-8">Explore all courses</Link>
        </div>
      </div>

      <div className="rounded-3xl bg-white p-6 shadow-card ring-1 ring-line sm:p-8">
        <h2 className="font-display text-xl font-bold">Get started in minutes</h2>
        <ol className="mt-6 space-y-5">
          {steps.map((s, i) => (
            <li key={s.t} className="flex gap-4">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-marigold-400 font-display text-base font-extrabold text-ink shadow-[0_3px_0_#B87A00]">
                {i + 1}
              </span>
              <div>
                <h3 className="text-[15px] font-bold">{s.t}</h3>
                <p className="mt-0.5 text-[14px] leading-relaxed text-ink/65">{s.b}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function TrustStrip() {
  const items = ["Study on phone or laptop", "UPI, cards and net banking", "Instant access after payment", "Earlier courses stay unlocked"];
  return (
    <section className="page pb-12 sm:pb-16">
      <ul className="grid gap-x-6 gap-y-3 rounded-2xl bg-white px-5 py-4 text-[14px] font-medium text-ink/75 shadow-card ring-1 ring-line sm:grid-cols-2 lg:grid-cols-4">
        {items.map((t) => (
          <li key={t} className="flex items-center gap-2.5">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600">
              <IconCheck width={14} height={14} strokeWidth={2.6} />
            </span>
            {t}
          </li>
        ))}
      </ul>
    </section>
  );
}
