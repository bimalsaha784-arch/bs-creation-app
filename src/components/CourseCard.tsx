import { Link } from "react-router-dom";
import type { Course } from "../types";

export function CourseCard({ course, owned }: { course: Course; owned?: boolean }) {
  const hasDiscount = course.discount_price != null && course.discount_price < course.price;
  const pct = hasDiscount
    ? Math.round(((course.price - (course.discount_price as number)) / course.price) * 100)
    : 0;

  return (
    <Link
      to={`/courses/${course.slug}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-slate-100">
        {course.thumbnail_url ? (
          <img
            src={course.thumbnail_url}
            alt={course.title}
            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-brand-100 to-brand-50 text-brand-600 font-semibold">
            BS Creation
          </div>
        )}
        {owned && (
          <span className="absolute left-3 top-3 rounded-full bg-emerald-600 px-3 py-1 text-xs font-semibold text-white">
            Owned
          </span>
        )}
        {!owned && hasDiscount && (
          <span className="absolute left-3 top-3 rounded-full bg-brand-600 px-3 py-1 text-xs font-semibold text-white">
            {pct}% off
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="line-clamp-2 font-semibold text-slate-900">{course.title}</h3>
        {course.short_description && (
          <p className="line-clamp-2 text-sm text-slate-500">{course.short_description}</p>
        )}
        <div className="mt-1 flex items-center gap-3 text-xs text-slate-500">
          {course.instructor_name && <span>{course.instructor_name}</span>}
          {course.duration && <span>· {course.duration}</span>}
          {course.level && <span>· {course.level}</span>}
        </div>

        <div className="mt-auto flex items-center justify-between pt-2">
          <div>
            {hasDiscount ? (
              <div className="flex items-baseline gap-2">
                <span className="text-lg font-bold text-slate-900">
                  {course.currency} {course.discount_price}
                </span>
                <span className="text-sm text-slate-400 line-through">
                  {course.currency} {course.price}
                </span>
              </div>
            ) : (
              <span className="text-lg font-bold text-slate-900">
                {course.currency} {course.price}
              </span>
            )}
          </div>
          <span className="rounded-full bg-brand-600 px-4 py-2 text-sm font-medium text-white transition group-hover:bg-brand-700">
            {owned ? "Start Learning" : "View Course"}
          </span>
        </div>
      </div>
    </Link>
  );
}
