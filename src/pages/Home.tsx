import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useCheckout } from "../hooks/useCheckout";
import { CheckoutNotice } from "../components/CheckoutNotice";
import { CourseCard, CourseCardSkeleton } from "../components/CourseCard";
import { fetchOwnedCourseIds, fetchPublishedCourses, type CatalogCourse } from "../lib/catalog";
import { IconCheck, IconDoc, IconPencil, IconTimer, IconPhone, IconLayers, IconShield, IconChart } from "../components/Icons";

export function Home() {
  const { session, user } = useAuth();
  const [featured, setFeatured] = useState<CatalogCourse[]>([]);
  const [ownedIds, setOwnedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const checkout = useCheckout();

  useEffect(() => {
    (async () => {
      setFeatured(await fetchPublishedCourses(6));
      if (user) setOwnedIds(await fetchOwnedCourseIds(user.id));
      setLoading(false);
    })();
  }, [user?.id]);

  return (
    <div>
      <Hero loggedIn={!!session} />

      {/* Featured courses */}
      <section className="page py-16 sm:py-20">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="section-title">Courses</h2>
            <p className="mt-2 max-w-xl text-ink/65">Each course has its own notes, practice sets and mock tests. Buy one, or several — they all stay in your account.</p>
          </div>
          <Link to="/courses" className="btn-secondary">View all courses</Link>
        </div>
        {loading ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => <CourseCardSkeleton key={i} />)}
          </div>
        ) : featured.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-line bg-white p-8 text-center text-ink/60">New courses are being added. Check back soon.</p>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
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

      {/* What's inside every course */}
      <section className="chalk-grid bg-brand-700 text-white">
        <div className="page py-16 sm:py-20">
          <h2 className="max-w-2xl font-display text-2xl font-bold text-white sm:text-[32px] sm:leading-tight">
            Read the chapter, practise it, then test yourself under exam conditions.
          </h2>
          <div className="mt-10 grid gap-px overflow-hidden rounded-2xl bg-white/15 md:grid-cols-3">
            {[
              {
                icon: IconDoc,
                title: "Reading material",
                body: "Chapter-wise PDF notes you can open in the course player on any device, whenever you need to revise.",
              },
              {
                icon: IconPencil,
                title: "Practice questions",
                body: "Topic-wise question sets to use right after each chapter, so gaps show up early instead of on exam day.",
              },
              {
                icon: IconTimer,
                title: "Mock tests",
                body: "Timed tests to take once you've covered the syllabus, so you can check your speed and accuracy.",
              },
            ].map(({ icon: Icon, title, body }) => (
              <div key={title} className="bg-brand-700 p-6 sm:p-8">
                <Icon width={28} height={28} className="text-marigold-300" />
                <h3 className="mt-4 text-lg font-bold text-white">{title}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-white/75">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why BS Creation */}
      <section className="page grid gap-10 py-16 sm:py-20 lg:grid-cols-[1fr_1.3fr] lg:gap-16">
        <div>
          <h2 className="section-title">Why students choose BS Creation</h2>
          <p className="mt-3 max-w-md leading-relaxed text-ink/65">
            One account for all your preparation. Your courses, progress and payment receipts stay together, and adding another course never affects the ones you already have.
          </p>
        </div>
        <ul className="grid gap-x-8 gap-y-7 sm:grid-cols-2">
          {[
            { icon: IconLayers, title: "Organised by subject", body: "Every course is split into subjects and chapters, so you always know what to study next." },
            { icon: IconChart, title: "Progress you can see", body: "Mark lessons complete and pick up exactly where you left off from your dashboard." },
            { icon: IconPhone, title: "Made for your phone", body: "Notes, practice and tests all work on a mobile screen. No app to install." },
            { icon: IconShield, title: "Secure payments", body: "Pay with UPI, cards or net banking through Razorpay. Access unlocks right after payment." },
          ].map(({ icon: Icon, title, body }) => (
            <li key={title} className="flex gap-4">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                <Icon width={22} height={22} />
              </span>
              <div>
                <h3 className="text-base font-bold">{title}</h3>
                <p className="mt-1 text-[15px] leading-relaxed text-ink/65">{body}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* How it works — a real sequence, so numbered */}
      <section className="border-y border-line bg-white">
        <div className="page py-16 sm:py-20">
          <h2 className="section-title">Getting started takes a few minutes</h2>
          <ol className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { t: "Create your account", b: "Sign up with email or Google. It's free." },
              { t: "Pick a course", b: "See subjects, notes, practice sets and mock tests before you buy." },
              { t: "Pay securely", b: "Checkout through Razorpay. The course unlocks immediately." },
              { t: "Start studying", b: "Open it from My Courses any time. Come back for more courses later." },
            ].map((s, i) => (
              <li key={s.t} className="relative">
                <span className="font-display text-4xl font-extrabold text-marigold-400">{i + 1}</span>
                <h3 className="mt-2 text-base font-bold">{s.t}</h3>
                <p className="mt-1 text-[15px] leading-relaxed text-ink/65">{s.b}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Final CTA */}
      <section className="page py-16 sm:py-20">
        <div className="flex flex-col items-start justify-between gap-6 rounded-3xl bg-marigold-50 p-8 sm:p-12 md:flex-row md:items-center">
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

function Hero({ loggedIn }: { loggedIn: boolean }) {
  return (
    <section className="border-b border-line bg-white">
      <div className="page grid items-center gap-12 py-12 sm:py-16 lg:grid-cols-[1.1fr_1fr] lg:gap-16 lg:py-20">
        <div>
          <h1 className="font-display text-[34px] font-extrabold leading-[1.08] sm:text-5xl lg:text-[56px]">
            Prepare for your exam with notes, practice and mock tests in one place.
          </h1>
          <p className="mt-5 max-w-lg text-lg leading-relaxed text-ink/70">
            BS Creation courses give you chapter-wise reading material, topic-wise practice questions and timed mock tests, arranged subject by subject.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link to="/courses" className="btn-primary h-12 px-6 text-base">Explore courses</Link>
            {loggedIn ? (
              <Link to="/dashboard" className="btn-secondary h-12 px-6 text-base">Go to my dashboard</Link>
            ) : (
              <>
                <Link to="/register" className="btn-secondary h-12 px-6 text-base">Create free account</Link>
                <Link to="/login" className="btn-ghost h-12 px-4 text-base">Log in</Link>
              </>
            )}
          </div>
          <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-ink/70">
            {["Study on phone or laptop", "UPI, cards and net banking", "Instant access after payment"].map((t) => (
              <li key={t} className="inline-flex items-center gap-1.5">
                <IconCheck width={16} height={16} className="text-brand-500" /> {t}
              </li>
            ))}
          </ul>
        </div>

        <QuestionCard />
      </div>
    </section>
  );
}

/** A sample practice question — shows students what studying on BS Creation feels like. */
function QuestionCard() {
  const options = ["Oxygen", "Carbon dioxide", "Nitrogen", "Hydrogen"];
  const correct = 1;
  return (
    <div className="chalk-grid relative rounded-3xl bg-brand-700 p-4 sm:p-6" aria-label="Sample practice question">
      <div className="rounded-2xl bg-white p-5 shadow-lift sm:p-6">
        <div className="flex items-center justify-between text-xs font-semibold text-ink/55">
          <span>Sample question 14 of 50</span>
          <span className="inline-flex items-center gap-1 rounded-md bg-marigold-50 px-2 py-1 text-marigold-600">
            <IconTimer width={14} height={14} /> 32:10 left
          </span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-brand-50">
          <div className="h-full w-[28%] rounded-full bg-brand-500" />
        </div>
        <p className="mt-5 text-[17px] font-semibold leading-snug">
          Which gas do green plants take in from the air during photosynthesis?
        </p>
        <ul className="mt-4 space-y-2">
          {options.map((o, i) => (
            <li
              key={o}
              className={`flex items-center gap-3 rounded-xl border px-3.5 py-2.5 text-[15px] ${
                i === correct ? "q-correct border-line" : "border-line"
              }`}
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-paper text-xs font-bold text-ink/60">
                {String.fromCharCode(65 + i)}
              </span>
              <span className="flex-1">{o}</span>
              {i === correct && (
                <span className="q-tick flex h-6 w-6 items-center justify-center rounded-full bg-brand-500 text-white">
                  <IconCheck width={14} height={14} strokeWidth={2.6} />
                </span>
              )}
            </li>
          ))}
        </ul>
        <p className="q-explain mt-4 rounded-xl bg-brand-50 px-3.5 py-3 text-sm leading-relaxed text-brand-800">
          <strong>Correct.</strong> Plants absorb carbon dioxide and release oxygen during photosynthesis.
        </p>
      </div>
    </div>
  );
}
