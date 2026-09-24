import { useEffect, useRef, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../hooks/useAuth";
import { lessonIcon } from "../components/lessonIcon";
import { IconArrowLeft, IconCheck, IconCheckCircle, IconExpand, IconMenu, IconClose } from "../components/Icons";
import type { Module, Lesson } from "../types";

export function Learn() {
  const { courseId } = useParams();
  const [searchParams] = useSearchParams();
  const { session, user } = useAuth();

  const [modules, setModules] = useState<(Module & { lessons: Lesson[] })[]>([]);
  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [htmlContent, setHtmlContent] = useState<string | null>(null);
  const [contentError, setContentError] = useState<string | null>(null);
  const [loadingContent, setLoadingContent] = useState(false);
  const [courseTitle, setCourseTitle] = useState("");
  const [courseSlug, setCourseSlug] = useState<string | null>(null);
  const [navOpen, setNavOpen] = useState(false);
  const [completed, setCompleted] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (!courseId) return;
    (async () => {
      const { data: course } = await supabase.from("courses").select("title, slug").eq("id", courseId).single();
      setCourseTitle(course?.title ?? "");
      setCourseSlug(course?.slug ?? null);

      const { data: moduleData } = await supabase
        .from("modules")
        .select("*, lessons(*)")
        .eq("course_id", courseId)
        .order("position");
      const withSortedLessons = (moduleData ?? []).map((m: any) => ({
        ...m,
        lessons: (m.lessons ?? []).sort((a: Lesson, b: Lesson) => a.position - b.position),
      }));
      setModules(withSortedLessons);

      // Completed lessons (for the ticks in the sidebar)
      if (user) {
        const { data: prog } = await supabase
          .from("progress")
          .select("lesson_id, completed")
          .eq("user_id", user.id)
          .eq("course_id", courseId);
        setCompleted(new Set((prog ?? []).filter((p: any) => p.completed).map((p: any) => p.lesson_id)));
      }

      // If a specific lesson was requested via ?lesson=..., open that one
      // (used by the "Continue Learning" button on the dashboard).
      const requestedLessonId = searchParams.get("lesson");
      let toOpen: Lesson | null = null;
      if (requestedLessonId) {
        for (const m of withSortedLessons) {
          const found = m.lessons.find((l: Lesson) => l.id === requestedLessonId);
          if (found) {
            toOpen = found;
            break;
          }
        }
      }
      if (!toOpen && withSortedLessons[0]?.lessons?.[0]) {
        toOpen = withSortedLessons[0].lessons[0];
      }
      if (toOpen) selectLesson(toOpen);
    })();
  }, [courseId]);

  async function selectLesson(lesson: Lesson) {
    setActiveLesson(lesson);
    setSignedUrl(null);
    setHtmlContent(null);
    setContentError(null);
    setNavOpen(false);

    if (lesson.content_type === "text") return; // text lessons render inline, no signed URL needed

    setLoadingContent(true);
    try {
      const res = await fetch(`/api/get-signed-url?lessonId=${lesson.id}`, {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Access denied");
      setSignedUrl(data.url);

      // For HTML applications, fetch the raw content ourselves and render it via
      // srcDoc. This guarantees correct rendering regardless of whatever
      // Content-Type header the storage object happens to have.
      if (lesson.content_type === "html_app") {
        const htmlRes = await fetch(data.url);
        const htmlText = await htmlRes.text();
        setHtmlContent(htmlText);
      }
    } catch (e: any) {
      setContentError(e.message);
    } finally {
      setLoadingContent(false);
    }
  }

  async function markComplete() {
    if (!user || !activeLesson || !courseId) return;
    setSaving(true);
    const { error } = await supabase.from("progress").upsert(
      {
        user_id: user.id,
        course_id: courseId,
        lesson_id: activeLesson.id,
        completed: true,
        last_accessed_at: new Date().toISOString(),
      },
      { onConflict: "user_id,lesson_id" }
    );
    setSaving(false);
    if (!error) setCompleted((prev) => new Set(prev).add(activeLesson.id));
  }

  function goFullscreen() {
    const el = iframeRef.current;
    if (!el) return;
    if (el.requestFullscreen) {
      el.requestFullscreen();
    } else if ((el as any).webkitRequestFullscreen) {
      (el as any).webkitRequestFullscreen();
    }
  }

  const allLessons = modules.flatMap((m) => m.lessons);
  const idx = activeLesson ? allLessons.findIndex((l) => l.id === activeLesson.id) : -1;
  const nextLesson = idx >= 0 ? allLessons[idx + 1] : undefined;
  const pct = allLessons.length ? Math.round((allLessons.filter((l) => completed.has(l.id)).length / allLessons.length) * 100) : 0;
  const isDone = !!activeLesson && completed.has(activeLesson.id);
  const accessDenied = contentError === "You do not have access to this lesson";

  const sidebar = (
    <div className="p-4">
      <Link to="/dashboard#my-courses" className="inline-flex items-center gap-1.5 text-sm font-medium text-ink/60 hover:text-brand-700">
        <IconArrowLeft width={16} height={16} /> My courses
      </Link>
      <div className="mt-3 font-display text-lg font-bold leading-snug">{courseTitle}</div>
      <div className="mt-3">
        <div className="flex justify-between text-xs font-medium text-ink/55">
          <span>Your progress</span>
          <span>{pct}%</span>
        </div>
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white">
          <div className="h-full rounded-full bg-brand-500" style={{ width: `${pct}%` }} />
        </div>
      </div>

      <div className="mt-5 space-y-5">
        {modules.map((m) => (
          <div key={m.id}>
            <div className="mb-1.5 px-1 text-[13px] font-semibold text-ink/55">{m.title}</div>
            <ul className="space-y-0.5">
              {m.lessons.map((l) => {
                const Icon = lessonIcon(l);
                const active = activeLesson?.id === l.id;
                const done = completed.has(l.id);
                return (
                  <li key={l.id}>
                    <button
                      onClick={() => selectLesson(l)}
                      aria-current={active ? "true" : undefined}
                      className={`flex min-h-[44px] w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm ${
                        active ? "bg-brand-700 text-white" : "text-ink/75 hover:bg-white"
                      }`}
                    >
                      <Icon width={16} height={16} className={`shrink-0 ${active ? "text-white/80" : "text-brand-500"}`} />
                      <span className="flex-1">{l.title}</span>
                      {done && <IconCheckCircle width={16} height={16} className={`shrink-0 ${active ? "text-marigold-300" : "text-brand-500"}`} aria-label="Completed" />}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="flex min-h-[calc(100vh-64px)] flex-col lg:flex-row">
      {/* Mobile: course content toggle */}
      <div className="sticky top-16 z-20 flex items-center gap-3 border-b border-line bg-white px-4 py-2 lg:hidden">
        <button onClick={() => setNavOpen(true)} className="btn-secondary btn-sm">
          <IconMenu width={16} height={16} /> Lessons
        </button>
        <span className="min-w-0 flex-1 truncate text-sm font-medium text-ink/70">{courseTitle}</span>
        <span className="text-xs font-semibold text-brand-700">{pct}%</span>
      </div>

      {/* Mobile drawer */}
      {navOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-ink/40" onClick={() => setNavOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-[86%] max-w-sm overflow-y-auto bg-paper shadow-lift">
            <div className="flex justify-end p-2">
              <button onClick={() => setNavOpen(false)} aria-label="Close lessons" className="flex h-11 w-11 items-center justify-center rounded-xl hover:bg-white">
                <IconClose width={22} height={22} />
              </button>
            </div>
            <div className="-mt-6">{sidebar}</div>
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden w-80 shrink-0 border-r border-line bg-paper lg:block">
        <div className="sticky top-16 max-h-[calc(100vh-64px)] overflow-y-auto">{sidebar}</div>
      </aside>

      {/* Content */}
      <section className="min-w-0 flex-1 bg-white p-4 sm:p-6 lg:p-8">
        {!activeLesson ? (
          <p className="text-ink/60">{modules.length === 0 ? "Loading course…" : "Select a lesson to begin."}</p>
        ) : (
          <div className="mx-auto max-w-5xl">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h1 className="font-display text-xl font-bold sm:text-2xl">{activeLesson.title}</h1>
              {activeLesson.content_type === "html_app" && htmlContent && (
                <button onClick={goFullscreen} className="btn-secondary btn-sm">
                  <IconExpand width={16} height={16} /> Fullscreen
                </button>
              )}
            </div>

            <div className="mt-4 min-h-[400px] overflow-hidden rounded-2xl border border-line bg-white">
              {loadingContent && (
                <div className="flex h-[400px] items-center justify-center">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
                </div>
              )}
              {contentError && (
                <div className="p-8 text-center">
                  <p className={accessDenied ? "text-ink/75" : "text-red-700"}>
                    {accessDenied
                      ? "You don't have access to this lesson. Please purchase the course to unlock it."
                      : contentError}
                  </p>
                  {accessDenied && courseSlug && (
                    <Link to={`/courses/${courseSlug}`} className="btn-primary mt-4">View course</Link>
                  )}
                </div>
              )}

              {!loadingContent && !contentError && activeLesson.content_type === "pdf" && signedUrl && (
                <iframe src={signedUrl} className="h-[75vh] min-h-[500px] w-full" title={activeLesson.title} />
              )}

              {!loadingContent && !contentError && activeLesson.content_type === "html_app" && htmlContent && (
                <iframe
                  ref={iframeRef}
                  srcDoc={htmlContent}
                  className="h-[80vh] w-full"
                  title={activeLesson.title}
                  sandbox="allow-scripts allow-same-origin"
                  allowFullScreen
                />
              )}

              {!loadingContent && !contentError && activeLesson.content_type === "video" && signedUrl && (
                <video src={signedUrl} controls className="w-full" />
              )}
            </div>

            {activeLesson.content_type === "pdf" && signedUrl && !contentError && (
              <p className="mt-2 text-xs text-ink/50">
                PDF not showing on your phone?{" "}
                <a href={signedUrl} target="_blank" rel="noreferrer" className="font-medium text-brand-700 underline">Open it in a new tab</a>.
              </p>
            )}

            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <button onClick={markComplete} disabled={saving || isDone} className={isDone ? "btn-secondary" : "btn-primary"}>
                {isDone ? (<><IconCheck width={18} height={18} /> Completed</>) : saving ? "Saving…" : "Mark complete"}
              </button>
              {nextLesson && (
                <button onClick={() => selectLesson(nextLesson)} className="btn-ghost">
                  Next: <span className="max-w-[14rem] truncate">{nextLesson.title}</span>
                </button>
              )}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
