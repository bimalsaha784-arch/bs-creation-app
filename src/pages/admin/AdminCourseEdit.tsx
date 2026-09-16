import { useEffect, useRef, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../hooks/useAuth";
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
  const [navOpen, setNavOpen] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (!courseId) return;
    (async () => {
      const { data: course } = await supabase.from("courses").select("title").eq("id", courseId).single();
      setCourseTitle(course?.title ?? "");

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

    if (lesson.content_type === "text") return;

    setLoadingContent(true);
    try {
      const res = await fetch(`/api/get-signed-url?lessonId=${lesson.id}`, {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Access denied");
      setSignedUrl(data.url);

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
    await supabase.from("progress").upsert(
      {
        user_id: user.id,
        course_id: courseId,
        lesson_id: activeLesson.id,
        completed: true,
        last_accessed_at: new Date().toISOString(),
      },
      { onConflict: "user_id,lesson_id" }
    );
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

  return (
    <div className="flex min-h-[calc(100vh-64px)] flex-col md:flex-row">
      <button
        onClick={() => setNavOpen((v) => !v)}
        className="border-b border-slate-100 px-4 py-3 text-left text-sm font-medium text-slate-700 md:hidden"
      >
        ☰ Course Content
      </button>

      <aside
        className={`${navOpen ? "block" : "hidden"} w-full border-r border-slate-100 bg-slate-50 p-4 md:block md:w-72`}
      >
        <div className="mb-4 font-semibold text-slate-900">{courseTitle}</div>
        {modules.map((m) => (
          <div key={m.id} className="mb-4">
            <div className="mb-1 text-sm font-medium text-slate-700">{m.title}</div>
            <ul>
              {m.lessons.map((l) => (
                <li key={l.id}>
                  <button
                    onClick={() => selectLesson(l)}
                    className={`w-full rounded-lg px-3 py-2 text-left text-sm ${
                      activeLesson?.id === l.id ? "bg-brand-100 text-brand-700" : "text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    {l.title}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </aside>

      <section className="flex-1 p-6">
        {!activeLesson ? (
          <p className="text-slate-500">Select a lesson to begin.</p>
        ) : (
          <div>
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-slate-900">{activeLesson.title}</h2>
              {activeLesson.content_type === "html_app" && htmlContent && (
                <button
                  onClick={goFullscreen}
                  className="rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
                >
                  ⛶ Fullscreen
                </button>
              )}
            </div>

            <div className="mt-4 min-h-[400px] rounded-xl border border-slate-200 bg-white">
              {loadingContent && <div className="p-8 text-slate-400">Loading content…</div>}
              {contentError && (
                <div className="p-8 text-red-600">
                  {contentError === "You do not have access to this lesson"
                    ? "You don't have access to this lesson. Please purchase the course to unlock it."
                    : contentError}
                </div>
              )}

              {!loadingContent && !contentError && activeLesson.content_type === "pdf" && signedUrl && (
                <iframe src={signedUrl} className="h-[600px] w-full rounded-xl" title={activeLesson.title} />
              )}

              {!loadingContent && !contentError && activeLesson.content_type === "html_app" && htmlContent && (
                <iframe
                  ref={iframeRef}
                  srcDoc={htmlContent}
                  className="h-[80vh] w-full rounded-xl"
                  title={activeLesson.title}
                  sandbox="allow-scripts allow-same-origin"
                  allowFullScreen
                />
              )}

              {!loadingContent && !contentError && activeLesson.content_type === "video" && signedUrl && (
                <video src={signedUrl} controls className="w-full rounded-xl" />
              )}
            </div>

            <button
              onClick={markComplete}
              className="mt-4 rounded-full bg-brand-600 px-5 py-2 text-sm font-medium text-white hover:bg-brand-700"
            >
              Mark Complete
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
