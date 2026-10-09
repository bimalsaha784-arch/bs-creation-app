import { Link } from "react-router-dom";
import type { Course } from "../types";
import type { CourseStats } from "../lib/catalog";
import { discountPct, effectivePrice, formatPrice } from "../lib/format";
import { useTilt } from "../hooks/useTilt";
import { CourseThumb } from "./CourseThumb";
import { IconCheckCircle, IconDoc, IconPencil, IconTimer, IconPlay } from "./Icons";

/**
 * Course card used everywhere (home, catalogue, dashboard "Explore more").
 * - owned=true  → "Purchased" badge + "Access course" (no payment button)
 * - owned=false → price + "View details" + "Buy now"
 * On phones the card is a compact row (image left); from tablet up it is a
 * tall card that tilts in 3D under the mouse.
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
  const tilt = useTilt<HTMLElement>(5);
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
    <article
      {...tilt}
      className="tilt-card group flex h-full flex-col overflow-hidden rounded-2xl bg-white shadow-card ring-1 ring-line hover:shadow-lift"
    >
      <div className="flex gap-3 p-3 sm:block sm:p-0">
        <Link
          to={`/courses/${course.slug}`}
          className="relative block h-[92px] w-[112px] shrink-0 overflow-hidden rounded-xl bg-brand-50 sm:aspect-[16/9] sm:h-auto sm:w-full sm:rounded-none"
          tabIndex={-1}
        >
          <CourseThumb course={course} className="transition-transform duration-300 sm:group-hover:scale-[1.04]" />
          {owned ? (
            <span className="absolute left-1.5 top-1.5 inline-flex items-center gap-1 rounded-md bg-white/95 px-1.5 py-0.5 text-[10px] font-semibold text-brand-700 shadow-sm sm:left-3 sm:top-3 sm:rounded-lg sm:px-2.5 sm:py-1 sm:text-xs">
              <IconCheckCircle width={12} height={12} /> Purchased
            </span>
          ) : pct > 0 ? (
            <span className="absolute left-1.5 top-1.5 rounded-md bg-marigold-400 px-1.5 py-0.5 text-[10px] font-bold text-ink shadow-sm sm:left-3 sm:top-3 sm:rounded-lg sm:px-2.5 sm:py-1 sm:text-xs">
              {pct}% off
            </span>
          ) : null}
        </Link>

        <div className="min-w-0 flex-1 sm:p-5 sm:pb-0">
          <h3 className="text-[16px] font-bold leading-snug sm:text-[17px]">
            <Link to={`/courses/${course.slug}`} className="line-clamp-2 hover:text-brand-600 sm:min-h-[2.6em]">
              {course.title}
            </Link>
          </h3>
          <p className="mt-1 line-clamp-1 text-[13px] leading-relaxed text-ink/60 sm:mt-1.5 sm:line-clamp-2 sm:min-h-[2.8em] sm:text-sm">
            {course.short_description || course.description || " "}
          </p>

          {shown.length > 0 && (
            <div className="mt-3 hidden flex-wrap gap-1.5 sm:flex">
              {shown.map((s) => (
                <span key={s} className="chip max-w-[11rem] truncate">{s}</span>
              ))}
              {more > 0 && <span className="chip bg-transparent text-ink/50">+{more} more</span>}
            </div>
          )}

          {facts.length > 0 && (
            <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[12px] text-ink/65 sm:mt-3 sm:gap-x-4 sm:gap-y-1.5 sm:text-[13px]">
              {facts.map(({ icon: Icon, text }) => (
                <li key={text} className="inline-flex items-center gap-1.5">
                  <Icon width={14} height={14} className="text-brand-500" /> {text}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="mt-auto px-3 pb-3 pt-1 sm:px-5 sm:pb-5 sm:pt-4">
        {owned ? (
          <Link to={`/learn/${course.id}`} className="btn-primary w-full">
            Access course
          </Link>
        ) : (
          <>
            <div className="mb-3 flex items-baseline gap-2">
              <span className="font-display text-xl font-bold text-brand-800">{formatPrice(price, course.currency)}</span>
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
    </article>
  );
}

export function CourseCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl bg-white ring-1 ring-line">
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
