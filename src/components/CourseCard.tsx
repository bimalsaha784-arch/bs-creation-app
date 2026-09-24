import { Link } from "react-router-dom";
import type { Course } from "../types";
import type { CourseStats } from "../lib/catalog";
import { discountPct, effectivePrice, formatPrice } from "../lib/format";
import { CourseThumb } from "./CourseThumb";
import { IconCheckCircle, IconDoc, IconPencil, IconTimer, IconPlay } from "./Icons";

/**
 * Course card used everywhere (home, catalogue, dashboard "Explore more").
 * - owned=true  → "Purchased" badge + "Access course" (no payment button)
 * - owned=false → price + "View details" + "Buy now"
 */
export function CourseCard({
  course,
  stats,
  owned,
  onBuy,
  buying,
}: {
  course: Course;
  stats?: CourseStats;
  owned?: boolean;
  onBuy?: (course: Course) => void;
  buying?: boolean;
}) {
  const pct = discountPct(course);
  const price = effectivePrice(course);
  const subjects = stats?.subjects ?? [];
  const shown = subjects.slice(0, 3);
  const more = subjects.length - shown.length;

  const facts = [
    stats?.notes ? { icon: IconDoc, text: `${stats.notes} ${stats.notes === 1 ? "note" : "notes"}` } : null,
    stats?.practice ? { icon: IconPencil, text: `${stats.practice} practice ${stats.practice === 1 ? "set" : "sets"}` } : null,
    stats?.mocks ? { icon: IconTimer, text: `${stats.mocks} mock ${stats.mocks === 1 ? "test" : "tests"}` } : null,
    stats?.videos ? { icon: IconPlay, text: `${stats.videos} ${stats.videos === 1 ? "video" : "videos"}` } : null,
  ].filter(Boolean) as { icon: typeof IconDoc; text: string }[];

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-white shadow-card transition-shadow duration-200 hover:shadow-lift">
      <Link to={`/courses/${course.slug}`} className="relative block aspect-[16/9] overflow-hidden bg-brand-50" tabIndex={-1}>
        <CourseThumb course={course} />
        {owned ? (
          <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-lg bg-white/95 px-2.5 py-1 text-xs font-semibold text-brand-700 shadow-sm">
            <IconCheckCircle width={14} height={14} /> Purchased
          </span>
        ) : pct > 0 ? (
          <span className="absolute left-3 top-3 rounded-lg bg-marigold-400 px-2.5 py-1 text-xs font-bold text-ink shadow-sm">
            {pct}% off
          </span>
        ) : null}
      </Link>

      <div className="flex flex-1 flex-col p-4 sm:p-5">
        <h3 className="text-[17px] font-bold leading-snug">
          <Link to={`/courses/${course.slug}`} className="line-clamp-2 min-h-[2.6em] hover:text-brand-700">
            {course.title}
          </Link>
        </h3>
        <p className="mt-1.5 line-clamp-2 min-h-[2.8em] text-sm leading-relaxed text-ink/65">
          {course.short_description || course.description || "\u00a0"}
        </p>

        {shown.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {shown.map((s) => (
              <span key={s} className="chip max-w-[11rem] truncate">{s}</span>
            ))}
            {more > 0 && <span className="chip bg-transparent text-ink/50">+{more} more</span>}
          </div>
        )}

        {facts.length > 0 && (
          <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-[13px] text-ink/70">
            {facts.map(({ icon: Icon, text }) => (
              <li key={text} className="inline-flex items-center gap-1.5">
                <Icon width={15} height={15} className="text-brand-500" /> {text}
              </li>
            ))}
          </ul>
        )}

        <div className="mt-auto pt-4">
          {owned ? (
            <Link to={`/learn/${course.id}`} className="btn-primary w-full">
              Access course
            </Link>
          ) : (
            <>
              <div className="mb-3 flex items-baseline gap-2">
                <span className="font-display text-xl font-bold">{formatPrice(price, course.currency)}</span>
                {pct > 0 && (
                  <span className="text-sm text-ink/40 line-through">{formatPrice(course.price, course.currency)}</span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Link to={`/courses/${course.slug}`} className="btn-secondary btn-sm">
                  View details
                </Link>
                {onBuy ? (
                  <button onClick={() => onBuy(course)} disabled={buying} className="btn-primary btn-sm">
                    {buying ? "Opening…" : "Buy now"}
                  </button>
                ) : (
                  <Link to={`/courses/${course.slug}`} className="btn-primary btn-sm">
                    Buy now
                  </Link>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </article>
  );
}

export function CourseCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-white">
      <div className="aspect-[16/9] animate-pulse bg-brand-50" />
      <div className="space-y-3 p-5">
        <div className="h-5 w-3/4 animate-pulse rounded bg-brand-50" />
        <div className="h-4 w-full animate-pulse rounded bg-brand-50" />
        <div className="h-4 w-2/3 animate-pulse rounded bg-brand-50" />
        <div className="h-10 w-full animate-pulse rounded-xl bg-brand-50" />
      </div>
    </div>
  );
}
