import { supabase } from "./supabaseClient";
import type { Course, Lesson } from "../types";

/**
 * Course catalogue helpers.
 *
 * Courses are managed entirely from the Admin panel (Supabase `courses` table),
 * so adding / removing / re-pricing / re-thumbnailing a course never needs a
 * code change. Card details such as subjects and "practice / mock test" counts
 * are worked out automatically from each course's modules and lessons:
 *
 *   - Subjects        = module titles (in order)
 *   - Notes           = PDF and text lessons
 *   - Mock tests      = HTML-app / quiz lessons whose title contains "mock"
 *   - Practice sets   = all other HTML-app / quiz lessons
 *
 * So naming a lesson e.g. "Mock Test 1" makes it count as a mock test.
 */

export interface CourseStats {
  subjects: string[];
  notes: number;
  practice: number;
  mocks: number;
  videos: number;
  lessons: number;
}

export type CatalogCourse = Course & { stats: CourseStats };

type RawModule = { title: string; position: number; lessons?: Pick<Lesson, "title" | "content_type">[] };

export function isMockLesson(l: Pick<Lesson, "title" | "content_type">) {
  return (l.content_type === "html_app" || l.content_type === "quiz") && /mock/i.test(l.title ?? "");
}
export function isPracticeLesson(l: Pick<Lesson, "title" | "content_type">) {
  return (l.content_type === "html_app" || l.content_type === "quiz") && !isMockLesson(l);
}

export function computeStats(modules: RawModule[] | null | undefined): CourseStats {
  const mods = [...(modules ?? [])].sort((a, b) => a.position - b.position);
  const stats: CourseStats = { subjects: [], notes: 0, practice: 0, mocks: 0, videos: 0, lessons: 0 };
  for (const m of mods) {
    if (m.title) stats.subjects.push(m.title);
    for (const l of m.lessons ?? []) {
      stats.lessons++;
      if (l.content_type === "pdf" || l.content_type === "text") stats.notes++;
      else if (l.content_type === "video") stats.videos++;
      else if (isMockLesson(l)) stats.mocks++;
      else if (isPracticeLesson(l)) stats.practice++;
    }
  }
  return stats;
}

const EMPTY_STATS: CourseStats = { subjects: [], notes: 0, practice: 0, mocks: 0, videos: 0, lessons: 0 };

/** All published courses, newest first, with content stats. */
export async function fetchPublishedCourses(limit?: number): Promise<CatalogCourse[]> {
  let q = supabase
    .from("courses")
    .select("*, modules(title, position, lessons(title, content_type))")
    .eq("status", "published")
    .order("created_at", { ascending: false });
  if (limit) q = q.limit(limit);
  const { data, error } = await q;

  if (!error && data) {
    return (data as any[]).map(({ modules, ...c }) => ({ ...(c as Course), stats: computeStats(modules) }));
  }

  // Fallback: plain course list (same query the site used before) so the
  // catalogue never disappears if the nested query is ever rejected.
  let q2 = supabase.from("courses").select("*").eq("status", "published").order("created_at", { ascending: false });
  if (limit) q2 = q2.limit(limit);
  const { data: plain } = await q2;
  return ((plain as Course[]) ?? []).map((c) => ({ ...c, stats: EMPTY_STATS }));
}

/** IDs of every course this user has active access to (unchanged enrollment logic). */
export async function fetchOwnedCourseIds(userId: string): Promise<Set<string>> {
  const { data } = await supabase
    .from("enrollments")
    .select("course_id")
    .eq("user_id", userId)
    .eq("status", "active");
  return new Set((data ?? []).map((e: any) => e.course_id as string));
}
