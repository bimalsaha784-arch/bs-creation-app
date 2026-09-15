import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import type { Course, Module, Lesson } from "../../types";

export function AdminCourseEdit() {
  const { id } = useParams();
  const [course, setCourse] = useState<Course | null>(null);
  const [modules, setModules] = useState<(Module & { lessons: Lesson[] })[]>([]);
  const [newModuleTitle, setNewModuleTitle] = useState("");
  const [uploading, setUploading] = useState(false);

  async function refresh() {
    const { data: courseData } = await supabase.from("courses").select("*").eq("id", id).single();
    setCourse(courseData as Course);

    const { data: moduleData } = await supabase
      .from("modules")
      .select("*, lessons(*)")
      .eq("course_id", id)
      .order("position");
    setModules((moduleData as any) ?? []);
  }

  useEffect(() => {
    refresh();
  }, [id]);

  async function addModule() {
    if (!newModuleTitle.trim() || !course) return;
    await supabase.from("modules").insert({
      course_id: course.id,
      title: newModuleTitle,
      position: modules.length,
    });
    setNewModuleTitle("");
    refresh();
  }

  async function addLesson(moduleId: string) {
    const title = window.prompt("Lesson title?");
    if (!title) return;
    const contentType = window.prompt("Content type: pdf, html_app, video, or text?", "pdf") as any;
    await supabase.from("lessons").insert({
      module_id: moduleId,
      title,
      content_type: contentType || "text",
      position: modules.find((m) => m.id === moduleId)?.lessons.length ?? 0,
      status: "published",
    });
    refresh();
  }

  async function uploadThumbnail(file: File) {
    if (!course) return;
    setUploading(true);
    const path = `${course.id}/thumbnail-${Date.now()}.${file.name.split(".").pop()}`;
    const { error } = await supabase.storage.from("course-thumbnails").upload(path, file, { upsert: true });
    if (!error) {
      const { data } = supabase.storage.from("course-thumbnails").getPublicUrl(path);
      await supabase.from("courses").update({ thumbnail_url: data.publicUrl }).eq("id", course.id);
      refresh();
    }
    setUploading(false);
  }

  async function uploadLessonFile(lessonId: string, file: File) {
    if (!course) return;
    // Uploaded into the PRIVATE course-files bucket — never publicly readable.
    // The admin's own session can write here because of the course_files_admin_all
    // storage policy, which checks is_admin() server-side.
    const path = `${course.id}/${lessonId}/${file.name}`;
    const { error } = await supabase.storage.from("course-files").upload(path, file, {
  upsert: true,
  contentType: file.type || "text/html",
});
    if (!error) {
      await supabase.from("lessons").update({ content_reference: path }).eq("id", lessonId);
      refresh();
    } else {
      alert(error.message);
    }
  }

  async function togglePublish() {
    if (!course) return;
    const next = course.status === "published" ? "draft" : "published";
    await supabase.from("courses").update({ status: next }).eq("id", course.id);
    refresh();
  }

  if (!course) return <div className="px-4 py-12 text-slate-500">Loading…</div>;

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">{course.title}</h1>
        <button
          onClick={togglePublish}
          className={`rounded-full px-4 py-2 text-sm font-semibold text-white ${
            course.status === "published" ? "bg-slate-700" : "bg-emerald-600"
          }`}
        >
          {course.status === "published" ? "Unpublish" : "Publish"}
        </button>
      </div>

      <div className="mt-6">
        <label className="text-sm font-medium text-slate-700">Thumbnail</label>
        <div className="mt-2 flex items-center gap-4">
          {course.thumbnail_url && <img src={course.thumbnail_url} className="h-16 w-28 rounded-lg object-cover" />}
          <input
            type="file"
            accept="image/*"
            disabled={uploading}
            onChange={(e) => e.target.files?.[0] && uploadThumbnail(e.target.files[0])}
          />
        </div>
      </div>

      <h2 className="mt-10 text-lg font-semibold text-slate-900">Modules & Lessons</h2>
      <div className="mt-4 space-y-4">
        {modules.map((m) => (
          <div key={m.id} className="rounded-xl border border-slate-200 p-4">
            <div className="flex items-center justify-between">
              <div className="font-medium text-slate-900">{m.title}</div>
              <button onClick={() => addLesson(m.id)} className="text-sm text-brand-600 hover:underline">
                + Add lesson
              </button>
            </div>
            <ul className="mt-2 space-y-2">
              {(m.lessons ?? []).map((l) => (
                <li key={l.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
                  <span>
                    {l.title} <span className="text-slate-400">({l.content_type})</span>
                    {l.content_reference ? (
                      <span className="ml-2 text-emerald-600">file attached</span>
                    ) : (
                      <span className="ml-2 text-amber-600">no file yet</span>
                    )}
                  </span>
                  {l.content_type !== "text" && (
                    <input
                      type="file"
                      className="text-xs"
                      onChange={(e) => e.target.files?.[0] && uploadLessonFile(l.id, e.target.files[0])}
                    />
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}

        <div className="flex gap-2">
          <input
            value={newModuleTitle}
            onChange={(e) => setNewModuleTitle(e.target.value)}
            placeholder="New module title"
            className="flex-1 rounded-lg border border-slate-200 px-4 py-2 text-sm"
          />
          <button onClick={addModule} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white">
            Add Module
          </button>
        </div>
      </div>
    </div>
  );
}
