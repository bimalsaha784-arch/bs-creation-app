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

  const [priceInput, setPriceInput] = useState("");
  const [discountInput, setDiscountInput] = useState("");
  const [savingPrice, setSavingPrice] = useState(false);
  const [priceSaved, setPriceSaved] = useState(false);

  // Course details (title, descriptions, etc.) — editable after creation
  const [details, setDetails] = useState({
    title: "", short_description: "", description: "", instructor_name: "", duration: "", level: "", language: "",
  });
  const [savingDetails, setSavingDetails] = useState(false);
  const [detailsSaved, setDetailsSaved] = useState(false);

  async function refresh() {
    const { data: courseData } = await supabase.from("courses").select("*").eq("id", id).single();
    setCourse(courseData as Course);
    if (courseData) {
      setPriceInput(String(courseData.price ?? ""));
      setDiscountInput(courseData.discount_price != null ? String(courseData.discount_price) : "");
      setDetails({
        title: courseData.title ?? "",
        short_description: courseData.short_description ?? "",
        description: courseData.description ?? "",
        instructor_name: courseData.instructor_name ?? "",
        duration: courseData.duration ?? "",
        level: courseData.level ?? "",
        language: courseData.language ?? "",
      });
    }

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

  async function savePrice() {
    if (!course) return;
    setSavingPrice(true);
    setPriceSaved(false);

    const newPrice = Number(priceInput);
    const newDiscount = discountInput.trim() === "" ? null : Number(discountInput);

    const { error } = await supabase
      .from("courses")
      .update({ price: newPrice, discount_price: newDiscount })
      .eq("id", course.id);

    setSavingPrice(false);
    if (error) {
      alert(error.message);
    } else {
      setPriceSaved(true);
      refresh();
      setTimeout(() => setPriceSaved(false), 2000);
    }
  }

  async function saveDetails() {
    if (!course || !details.title.trim()) return;
    setSavingDetails(true);
    setDetailsSaved(false);
    const clean = (v: string) => (v.trim() === "" ? null : v.trim());
    const { error } = await supabase
      .from("courses")
      .update({
        title: details.title.trim(),
        short_description: clean(details.short_description),
        description: clean(details.description),
        instructor_name: clean(details.instructor_name),
        duration: clean(details.duration),
        level: clean(details.level),
        language: clean(details.language),
      })
      .eq("id", course.id);
    setSavingDetails(false);
    if (error) {
      alert(error.message);
    } else {
      setDetailsSaved(true);
      refresh();
      setTimeout(() => setDetailsSaved(false), 2000);
    }
  }

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

  async function deleteModule(moduleId: string, moduleTitle: string) {
    const confirmed = window.confirm(
      `Delete module "${moduleTitle}" and all its lessons? This cannot be undone.`
    );
    if (!confirmed) return;
    await supabase.from("modules").delete().eq("id", moduleId);
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

  async function deleteLesson(lessonId: string, lessonTitle: string) {
    const confirmed = window.confirm(`Delete lesson "${lessonTitle}"? This cannot be undone.`);
    if (!confirmed) return;
    await supabase.from("lessons").delete().eq("id", lessonId);
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
    // contentType is force-set to text/html for html_app lessons because some
    // mobile browsers report the wrong (or empty) MIME type for .html files.
    const path = `${course.id}/${lessonId}/${file.name}`;
    const lessonType = modules.flatMap((m) => m.lessons ?? []).find((l) => l.id === lessonId)?.content_type;
    const isHtml = lessonType === "html_app" || /\.html?$/i.test(file.name);
    const { error } = await supabase.storage.from("course-files").upload(path, file, {
      upsert: true,
      // Previously this was always "text/html", which made uploaded PDFs/videos
      // display as garbled text. Only HTML apps need the forced type.
      contentType: isHtml ? "text/html" : file.type || undefined,
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

      <div className="mt-6 rounded-xl border border-slate-200 p-4">
        <div className="text-sm font-medium text-slate-700">Course details</div>
        <p className="mt-1 text-xs text-slate-500">
          Shown on course cards and the course page. The URL (slug: {course.slug}) stays the same.
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {([
            ["title", "Title"],
            ["instructor_name", "Instructor"],
            ["duration", "Duration (e.g. 3 months)"],
            ["level", "Level (e.g. Class 10)"],
            ["language", "Language"],
          ] as const).map(([key, label]) => (
            <label key={key} className={key === "title" ? "sm:col-span-2" : ""}>
              <span className="text-xs text-slate-500">{label}</span>
              <input
                value={details[key]}
                onChange={(e) => setDetails((d) => ({ ...d, [key]: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
            </label>
          ))}
          <label className="sm:col-span-2">
            <span className="text-xs text-slate-500">Short description (course cards, 1–2 lines)</span>
            <input
              value={details.short_description}
              onChange={(e) => setDetails((d) => ({ ...d, short_description: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </label>
          <label className="sm:col-span-2">
            <span className="text-xs text-slate-500">Full description (course page)</span>
            <textarea
              rows={5}
              value={details.description}
              onChange={(e) => setDetails((d) => ({ ...d, description: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </label>
        </div>
        <div className="mt-3 flex items-center gap-3">
          <button
            onClick={saveDetails}
            disabled={savingDetails || !details.title.trim()}
            className="rounded-full bg-brand-600 px-5 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
          >
            {savingDetails ? "Saving…" : "Save details"}
          </button>
          {detailsSaved && <span className="text-sm text-emerald-600">Saved</span>}
        </div>
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

      <div className="mt-8 rounded-xl border border-slate-200 p-4">
        <label className="text-sm font-medium text-slate-700">Price</label>
        <div className="mt-2 flex flex-wrap items-end gap-3">
          <div>
            <div className="text-xs text-slate-500">Price (₹)</div>
            <input
              type="number"
              min="0"
              value={priceInput}
              onChange={(e) => setPriceInput(e.target.value)}
              className="mt-1 w-32 rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <div className="text-xs text-slate-500">Discount price (optional)</div>
            <input
              type="number"
              min="0"
              value={discountInput}
              onChange={(e) => setDiscountInput(e.target.value)}
              placeholder="none"
              className="mt-1 w-32 rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </div>
          <button
            onClick={savePrice}
            disabled={savingPrice}
            className="rounded-full bg-brand-600 px-5 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
          >
            {savingPrice ? "Saving…" : "Save Price"}
          </button>
          {priceSaved && <span className="text-sm text-emerald-600">Saved ✓</span>}
        </div>
        <p className="mt-2 text-xs text-slate-400">Leave discount price empty to charge full price.</p>
      </div>

      <h2 className="mt-10 text-lg font-semibold text-slate-900">Modules & Lessons</h2>
      <p className="mt-1 text-xs text-slate-500">
        Module titles appear as the course's subjects on course cards. PDF lessons count as notes; HTML-app lessons count
        as practice sets, or as mock tests if the lesson title contains the word "Mock" (e.g. "Mock Test 1").
      </p>
      <div className="mt-4 space-y-4">
        {modules.map((m) => (
          <div key={m.id} className="rounded-xl border border-slate-200 p-4">
            <div className="flex items-center justify-between gap-2">
              <div className="font-medium text-slate-900">{m.title}</div>
              <div className="flex items-center gap-3">
                <button onClick={() => addLesson(m.id)} className="text-sm text-brand-600 hover:underline">
                  + Add lesson
                </button>
                <button
                  onClick={() => deleteModule(m.id, m.title)}
                  className="text-sm text-red-600 hover:underline"
                >
                  Delete module
                </button>
              </div>
            </div>
            <ul className="mt-2 space-y-2">
              {(m.lessons ?? []).map((l: Lesson) => (
                <li key={l.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
                  <span>
                    {l.title} <span className="text-slate-400">({l.content_type})</span>
                    {l.content_reference ? (
                      <span className="ml-2 text-emerald-600">file attached</span>
                    ) : (
                      <span className="ml-2 text-amber-600">no file yet</span>
                    )}
                  </span>
                  <div className="flex items-center gap-2">
                    {l.content_type !== "text" && (
                      <input
                        type="file"
                        className="text-xs"
                        onChange={(e) => e.target.files?.[0] && uploadLessonFile(l.id, e.target.files[0])}
                      />
                    )}
                    <button
                      onClick={() => deleteLesson(l.id, l.title)}
                      className="text-xs text-red-600 hover:underline"
                    >
                      Delete
                    </button>
                  </div>
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
