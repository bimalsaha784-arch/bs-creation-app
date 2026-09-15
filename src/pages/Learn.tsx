import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../hooks/useAuth";
import type { Module, Lesson } from "../types";

export function Learn() {
  const { courseId } = useParams();
  const { session, user } = useAuth();

  const [modules, setModules] = useState<(Module & { lessons: Lesson[] })[]>([]);
  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [contentError, setContentError] = useState<string | null>(null);
  const [loadingContent, setLoadingContent] = useState(false);
  const [courseTitle, setCourseTitle] = useState("");
  const [navOpen, setNavOpen] = useState(false);

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
      if (withSortedLessons[0]?.lessons?.[0]) {
        selectLesson(withSortedLessons[0].lessons[0]);
      }
    })();
  }, [courseId]);

  async function selectLesson(lesson: Lesson) {
    setActiveLesson(lesson);
    setSignedUrl(null);
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

  return (
    <div className="flex min-h-[calc(100vh-64px)] flex-col md:flex-row">
      {/* Mobile nav toggle */}
      <button
        onClick={() => setNavOpen((v) => !v)}
        className="border-b border-slate-100 px-4 py-3 text-left text-sm font-medium text-slate-700 md:hidden"
      >
        ☰ Course Content
      </button>

      {/* Sidebar */}
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

      {/* Content */}
      <section className="flex-1 p-6">
        {!activeLesson ? (
          <p className="text-slate-500">Select a lesson to begin.</p>
        ) : (
          <div>
            <h2 className="text-xl font-semibold text-slate-900">{activeLesson.title}</h2>

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

              {!loadingContent && !contentError && activeLesson.content_type === "html_app" && signedUrl && (
                <iframe
                  src={signedUrl}
                  className="h-[600px] w-full rounded-xl"
                  title={activeLesson.title}
                  sandbox="allow-scripts allow-same-origin"
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
