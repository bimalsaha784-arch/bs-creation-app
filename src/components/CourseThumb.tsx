import type { Course } from "../types";

/** Course image with a designed fallback for courses that don't have a thumbnail yet. */
export function CourseThumb({ course, className = "" }: { course: Pick<Course, "title" | "thumbnail_url">; className?: string }) {
  if (course.thumbnail_url) {
    return (
      <img
        src={course.thumbnail_url}
        alt={course.title}
        loading="lazy"
        className={`h-full w-full object-cover ${className}`}
      />
    );
  }
  const initials = course.title
    .split(/\s+/)
    .filter((w) => /^[A-Za-z0-9]/.test(w))
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
  return (
    <div className={`chalk-grid relative flex h-full w-full items-end bg-brand-700 p-4 ${className}`}>
      <span className="font-display text-4xl font-extrabold text-white/90">{initials || "BS"}</span>
      <span className="absolute bottom-4 right-4 h-1.5 w-10 rounded-full bg-marigold-400" />
    </div>
  );
}
