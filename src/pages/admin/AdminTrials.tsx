import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import { LoadError } from "../../components/LoadError";
import { TrialViewer, TypeIcon } from "../../components/trial/TrialViewer";
import {
  fetchTrialResources,
  newTrialPath,
  removeTrialFiles,
  TRIAL_RULES,
  TRIAL_TYPE_LABEL,
  TRIAL_TYPE_ORDER,
  trialPublicUrl,
  uploadTrialFile,
  validateTrialFile,
  type TrialResource,
  type TrialResourceType,
} from "../../lib/trial";

interface CourseRow {
  id: string;
  title: string;
  status: string;
  trial_enabled: boolean;
}

type Msg = { kind: "ok" | "err"; text: string } | null;

const field = "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none";

export function AdminTrials() {
  const [params, setParams] = useSearchParams();
  const [courses, setCourses] = useState<CourseRow[]>([]);
  const [coursesError, setCoursesError] = useState<string | null>(null);
  const [courseId, setCourseId] = useState<string>(params.get("course") ?? "");
  const [resources, setResources] = useState<TrialResource[]>([]);
  const [resLoading, setResLoading] = useState(false);
  const [resError, setResError] = useState<string | null>(null);
  const [msg, setMsg] = useState<Msg>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // add form
  const [type, setType] = useState<TrialResourceType>("html_app");
  const [files, setFiles] = useState<File[]>([]);
  const [thumb, setThumb] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [progress, setProgress] = useState<{ label: string; pct: number } | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const thumbInput = useRef<HTMLInputElement>(null);

  // inline edit
  const [editId, setEditId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const replaceInput = useRef<HTMLInputElement>(null);
  const replaceFor = useRef<TrialResource | null>(null);

  const course = courses.find((c) => c.id === courseId) ?? null;

  const loadCourses = useCallback(async () => {
    const { data, error } = await supabase
      .from("courses")
      .select("id, title, status, trial_enabled")
      .order("title")
      .limit(500);
    if (error) {
      console.error("AdminTrials: could not load courses:", error);
      setCoursesError(
        error.message.includes("trial_enabled")
          ? "The database is not ready for Free Trials yet. Run the SQL file supabase/migrations/0003_free_trials.sql in Supabase first."
          : error.message,
      );
      return;
    }
    setCoursesError(null);
    const list = (data ?? []) as CourseRow[];
    setCourses(list);
    setCourseId((cur) => (cur && list.some((c) => c.id === cur) ? cur : list[0]?.id ?? ""));
  }, []);

  useEffect(() => {
    void loadCourses();
  }, [loadCourses]);

  const loadResources = useCallback(async (id: string) => {
    if (!id) return;
    setResLoading(true);
    setResError(null);
    try {
      setResources(await fetchTrialResources(id, false));
    } catch (e) {
      console.error("AdminTrials: could not load resources:", e);
      setResError(
        /course_trial_resources/.test((e as { message?: string } | null)?.message ?? "")
          ? "The database is not ready for Free Trials yet. Run the SQL file supabase/migrations/0003_free_trials.sql in Supabase first."
          : "Could not load this course's previews.",
      );
    } finally {
      setResLoading(false);
    }
  }, []);

  useEffect(() => {
    setResources([]);
    setEditId(null);
    setMsg(null);
    if (courseId) {
      setParams({ course: courseId }, { replace: true });
      void loadResources(courseId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId, loadResources]);

  function ok(text: string) {
    setMsg({ kind: "ok", text });
  }
  function err(text: string) {
    setMsg({ kind: "err", text });
  }

  async function toggleCourseTrial() {
    if (!course) return;
    const next = !course.trial_enabled;
    if (next && resources.filter((r) => r.is_active).length === 0) {
      err("Add at least one visible preview before publishing the trial.");
      return;
    }
    const { error } = await supabase.from("courses").update({ trial_enabled: next }).eq("id", course.id);
    if (error) return err(`Could not save: ${error.message}`);
    setCourses((p) => p.map((c) => (c.id === course.id ? { ...c, trial_enabled: next } : c)));
    ok(next ? "Free trial is now PUBLISHED on this course's page." : "Free trial is now hidden from students.");
  }

  function pickFiles(list: FileList | null) {
    setMsg(null);
    const arr = Array.from(list ?? []);
    for (const f of arr) {
      const problem = validateTrialFile(type, f);
      if (problem) {
        err(problem);
        if (fileInput.current) fileInput.current.value = "";
        setFiles([]);
        return;
      }
    }
    setFiles(arr);
    if (arr.length === 1 && !title) setTitle(arr[0].name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " "));
  }

  function pickThumb(list: FileList | null) {
    const f = list?.[0] ?? null;
    if (f) {
      const problem = validateTrialFile("image", f);
      if (problem) {
        err(problem);
        if (thumbInput.current) thumbInput.current.value = "";
        return;
      }
    }
    setThumb(f);
  }

  function resetForm() {
    setFiles([]);
    setThumb(null);
    setTitle("");
    setDesc("");
    if (fileInput.current) fileInput.current.value = "";
    if (thumbInput.current) thumbInput.current.value = "";
  }

  async function addResources(e: FormEvent) {
    e.preventDefault();
    if (!course || busy) return;
    if (files.length === 0) return err("Choose a file to upload first.");
    if (type !== "image" && !title.trim()) return err("Please enter a title.");

    setBusy(true);
    setMsg(null);
    let next = resources.reduce((m, r) => Math.max(m, r.position), -1) + 1;
    let added = 0;
    try {
      let thumbPath: string | null = null;
      if (thumb && type !== "image") {
        setProgress({ label: "Uploading thumbnail…", pct: 0 });
        thumbPath = newTrialPath(course.id, thumb.name);
        await uploadTrialFile(thumbPath, thumb, (pct) => setProgress({ label: "Uploading thumbnail…", pct }));
      }
      for (let i = 0; i < files.length; i++) {
        const f = files[i];
        const label = files.length > 1 ? `Uploading ${i + 1} of ${files.length}: ${f.name}` : `Uploading ${f.name}`;
        setProgress({ label, pct: 0 });
        const path = newTrialPath(course.id, f.name);
        await uploadTrialFile(path, f, (pct) => setProgress({ label, pct }));
        const rowTitle =
          files.length > 1 || !title.trim() ? f.name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ") : title.trim();
        const { error } = await supabase.from("course_trial_resources").insert({
          course_id: course.id,
          title: rowTitle,
          description: desc.trim() || null,
          resource_type: type,
          storage_path: path,
          thumbnail_path: thumbPath,
          position: next++,
          is_active: true,
        });
        if (error) {
          await removeTrialFiles([path]);
          throw new Error(error.message);
        }
        added++;
      }
      resetForm();
      ok(`${added} preview${added === 1 ? "" : "s"} added. Turn on "Publish trial" to show ${added === 1 ? "it" : "them"} to students.`);
    } catch (e2) {
      err(e2 instanceof Error ? e2.message : "Upload failed.");
      if (added > 0) setMsg((m) => (m ? { ...m, text: `${m.text} (${added} were saved before the error.)` } : m));
    } finally {
      setProgress(null);
      setBusy(false);
      await loadResources(course.id);
    }
  }

  async function persistOrder(list: TrialResource[]) {
    const changed = list.filter((r, i) => r.position !== i);
    setResources(list.map((r, i) => ({ ...r, position: i })));
    for (const r of changed) {
      const idx = list.indexOf(r);
      const { error } = await supabase.from("course_trial_resources").update({ position: idx }).eq("id", r.id);
      if (error) {
        err(`Could not save the new order: ${error.message}`);
        if (course) await loadResources(course.id);
        return;
      }
    }
  }

  function move(i: number, d: -1 | 1) {
    const j = i + d;
    if (j < 0 || j >= resources.length) return;
    const list = [...resources];
    [list[i], list[j]] = [list[j], list[i]];
    void persistOrder(list);
  }

  async function toggleActive(r: TrialResource) {
    const { error } = await supabase.from("course_trial_resources").update({ is_active: !r.is_active }).eq("id", r.id);
    if (error) return err(`Could not change visibility: ${error.message}`);
    setResources((p) => p.map((x) => (x.id === r.id ? { ...x, is_active: !r.is_active } : x)));
  }

  function startEdit(r: TrialResource) {
    setEditId(r.id);
    setEditTitle(r.title);
    setEditDesc(r.description ?? "");
  }

  async function saveEdit(r: TrialResource) {
    if (!editTitle.trim()) return err("Title cannot be empty.");
    const { error } = await supabase
      .from("course_trial_resources")
      .update({ title: editTitle.trim(), description: editDesc.trim() || null })
      .eq("id", r.id);
    if (error) return err(`Could not save: ${error.message}`);
    setResources((p) =>
      p.map((x) => (x.id === r.id ? { ...x, title: editTitle.trim(), description: editDesc.trim() || null } : x)),
    );
    setEditId(null);
    ok("Saved.");
  }

  async function remove(r: TrialResource) {
    if (!confirm(`Remove "${r.title}"? The uploaded file will be deleted too.`)) return;
    const { error } = await supabase.from("course_trial_resources").delete().eq("id", r.id);
    if (error) return err(`Could not remove: ${error.message}`);
    await removeTrialFiles([r.storage_path, r.thumbnail_path]);
    const left = resources.filter((x) => x.id !== r.id);
    setResources(left);
    ok("Removed.");
    if (course?.trial_enabled && left.filter((x) => x.is_active).length === 0) {
      await supabase.from("courses").update({ trial_enabled: false }).eq("id", course.id);
      setCourses((p) => p.map((c) => (c.id === course.id ? { ...c, trial_enabled: false } : c)));
    }
  }

  async function doReplace(f: File | undefined) {
    const r = replaceFor.current;
    if (replaceInput.current) replaceInput.current.value = "";
    if (!f || !r || !course) return;
    const problem = validateTrialFile(r.resource_type, f);
    if (problem) return err(problem);
    setBusy(true);
    setMsg(null);
    try {
      const label = `Replacing with ${f.name}`;
      setProgress({ label, pct: 0 });
      const path = newTrialPath(course.id, f.name);
      await uploadTrialFile(path, f, (pct) => setProgress({ label, pct }));
      const { error } = await supabase.from("course_trial_resources").update({ storage_path: path }).eq("id", r.id);
      if (error) {
        await removeTrialFiles([path]);
        throw new Error(error.message);
      }
      await removeTrialFiles([r.storage_path]);
      ok("File replaced.");
    } catch (e) {
      err(e instanceof Error ? e.message : "Replace failed.");
    } finally {
      setProgress(null);
      setBusy(false);
      await loadResources(course.id);
    }
  }

  const rule = TRIAL_RULES[type];
  const activeCount = resources.filter((r) => r.is_active).length;

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-slate-900">Manage Course Free Trials</h1>
        <Link to="/admin" className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium hover:bg-slate-50">
          ← Admin home
        </Link>
      </div>

      {coursesError && <LoadError message={coursesError} onRetry={() => void loadCourses()} />}

      {!coursesError && (
        <>
          <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="trial-course">
            Course
          </label>
          <select id="trial-course" value={courseId} onChange={(e) => setCourseId(e.target.value)} className={`${field} max-w-xl`}>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
                {c.status !== "published" ? ` (${c.status})` : ""}
                {c.trial_enabled ? " — trial ON" : ""}
              </option>
            ))}
          </select>
          {courses.length === 0 && <p className="mt-3 text-sm text-slate-500">No courses yet. Create a course first.</p>}
        </>
      )}

      {msg && (
        <p
          role={msg.kind === "err" ? "alert" : "status"}
          className={`mt-4 rounded-lg px-3 py-2 text-sm ${msg.kind === "err" ? "bg-red-50 text-red-700" : "bg-green-50 text-green-800"}`}
        >
          {msg.text}
        </p>
      )}

      {course && (
        <>
          {/* Publish switch */}
          <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 p-5">
            <div>
              <div className="font-semibold text-slate-900">
                Trial section is {course.trial_enabled ? <span className="text-green-700">PUBLISHED</span> : <span className="text-slate-500">hidden</span>}
              </div>
              <p className="mt-1 text-sm text-slate-500">
                {activeCount} visible preview{activeCount === 1 ? "" : "s"}. Students see the “Try free before you buy” section on this course's page only when it is published and has at least one visible preview.
              </p>
              {course.status !== "published" && <p className="mt-1 text-sm text-amber-700">This course itself is not published yet, so nobody can see its page.</p>}
            </div>
            <button
              type="button"
              onClick={() => void toggleCourseTrial()}
              className={`rounded-full px-5 py-2.5 text-sm font-semibold ${course.trial_enabled ? "border border-slate-300 text-slate-700 hover:bg-slate-50" : "bg-brand-600 text-white hover:bg-brand-700"}`}
            >
              {course.trial_enabled ? "Unpublish trial" : "Publish trial"}
            </button>
          </div>

          {/* Add resource */}
          <form onSubmit={addResources} className="mt-6 rounded-2xl border border-slate-200 p-5">
            <h2 className="text-lg font-bold text-slate-900">Add Preview Resource</h2>
            <p className="mt-1 text-sm text-slate-500">
              Files added here are <b>public</b> (that is what a free preview is). Never upload paid material to this screen — paid lessons are added in “Manage Courses”.
            </p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Resource type</label>
                <select
                  value={type}
                  onChange={(e) => {
                    setType(e.target.value as TrialResourceType);
                    resetForm();
                  }}
                  className={field}
                  disabled={busy}
                >
                  {TRIAL_TYPE_ORDER.map((t) => (
                    <option key={t} value={t}>
                      {TRIAL_RULES[t].label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">{type === "image" ? "Image files" : "File"}</label>
                <input
                  ref={fileInput}
                  type="file"
                  accept={rule.accept}
                  multiple={type === "image"}
                  disabled={busy}
                  onChange={(e) => pickFiles(e.target.files)}
                  className="block w-full text-sm file:mr-3 file:rounded-full file:border-0 file:bg-brand-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-brand-700"
                />
                <p className="mt-1 text-xs text-slate-500">{rule.hint}</p>
              </div>
              {type !== "image" && (
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Title</label>
                  <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} className={field} disabled={busy} placeholder="e.g. Sample mock test" />
                </div>
              )}
              <div className={type === "image" ? "sm:col-span-2" : ""}>
                <label className="mb-1 block text-sm font-medium text-slate-700">Description (optional)</label>
                <input value={desc} onChange={(e) => setDesc(e.target.value)} maxLength={300} className={field} disabled={busy} />
              </div>
              {type !== "image" && (
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-sm font-medium text-slate-700">Thumbnail / poster (optional)</label>
                  <input
                    ref={thumbInput}
                    type="file"
                    accept={TRIAL_RULES.image.accept}
                    disabled={busy}
                    onChange={(e) => pickThumb(e.target.files)}
                    className="block w-full text-sm file:mr-3 file:rounded-full file:border-0 file:bg-slate-100 file:px-4 file:py-2 file:text-sm file:font-medium"
                  />
                </div>
              )}
            </div>
            {type === "html_app" && (
              <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
                Zip tip: put <code>index.html</code> in the zip (a single top-level folder is fine). CSS, JavaScript, images and fonts inside the zip are bundled automatically. Apps that download extra files while running (fetch / XHR of a local path) will not find them — keep everything inside the HTML/CSS/JS.
              </p>
            )}
            {progress && (
              <div className="mt-4" role="status">
                <div className="mb-1 flex justify-between text-xs text-slate-600">
                  <span className="truncate">{progress.label}</span>
                  <span>{progress.pct}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-brand-600 transition-all" style={{ width: `${progress.pct}%` }} />
                </div>
              </div>
            )}
            <button type="submit" disabled={busy} className="mt-4 rounded-full bg-brand-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60">
              {busy ? "Working…" : "Save preview"}
            </button>
          </form>

          {/* Existing resources */}
          <div className="mt-8">
            <h2 className="text-lg font-bold text-slate-900">Previews for this course ({resources.length})</h2>
            {resError && (
              <div className="mt-3">
                <LoadError message={resError} onRetry={() => void loadResources(course.id)} />
              </div>
            )}
            {resLoading && <p className="mt-3 text-sm text-slate-500">Loading…</p>}
            {!resLoading && !resError && resources.length === 0 && (
              <p className="mt-3 rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
                Nothing here yet. Add the first preview above.
              </p>
            )}
            <ul className="mt-3 space-y-3">
              {resources.map((r, i) => (
                <li key={r.id} className="rounded-2xl border border-slate-200 p-4">
                  <div className="flex items-start gap-3">
                    <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-brand-50 text-brand-600">
                      {r.thumbnail_path || r.resource_type === "image" ? (
                        <img src={trialPublicUrl(r.thumbnail_path || r.storage_path)} alt="" className="h-full w-full object-cover" loading="lazy" />
                      ) : (
                        <TypeIcon type={r.resource_type} />
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      {editId === r.id ? (
                        <div className="space-y-2">
                          <input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} maxLength={120} className={field} aria-label="Title" />
                          <input value={editDesc} onChange={(e) => setEditDesc(e.target.value)} maxLength={300} className={field} aria-label="Description" placeholder="Description (optional)" />
                          <div className="flex gap-2">
                            <button type="button" onClick={() => void saveEdit(r)} className="rounded-full bg-brand-600 px-4 py-1.5 text-sm font-medium text-white">Save</button>
                            <button type="button" onClick={() => setEditId(null)} className="rounded-full border border-slate-300 px-4 py-1.5 text-sm">Cancel</button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-semibold text-slate-900">{r.title}</span>
                            <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-600">{TRIAL_TYPE_LABEL[r.resource_type]}</span>
                            <span className={`rounded-md px-1.5 py-0.5 text-[11px] font-bold ${r.is_active ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700"}`}>
                              {r.is_active ? "VISIBLE" : "HIDDEN"}
                            </span>
                          </div>
                          {r.description && <p className="mt-0.5 text-sm text-slate-500">{r.description}</p>}
                        </>
                      )}
                    </div>
                  </div>
                  {editId !== r.id && (
                    <div className="mt-3 flex flex-wrap gap-2 text-sm">
                      <button type="button" onClick={() => setPreview(r.id)} className="rounded-full border border-slate-300 px-3 py-1.5 hover:bg-slate-50">▶ Preview</button>
                      <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className="rounded-full border border-slate-300 px-3 py-1.5 hover:bg-slate-50 disabled:opacity-40" aria-label="Move up">↑</button>
                      <button type="button" onClick={() => move(i, 1)} disabled={i === resources.length - 1} className="rounded-full border border-slate-300 px-3 py-1.5 hover:bg-slate-50 disabled:opacity-40" aria-label="Move down">↓</button>
                      <button type="button" onClick={() => startEdit(r)} className="rounded-full border border-slate-300 px-3 py-1.5 hover:bg-slate-50">Edit</button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => {
                          replaceFor.current = r;
                          if (replaceInput.current) {
                            replaceInput.current.accept = TRIAL_RULES[r.resource_type].accept;
                            replaceInput.current.click();
                          }
                        }}
                        className="rounded-full border border-slate-300 px-3 py-1.5 hover:bg-slate-50 disabled:opacity-40"
                      >
                        Replace file
                      </button>
                      <button type="button" onClick={() => void toggleActive(r)} className="rounded-full border border-slate-300 px-3 py-1.5 hover:bg-slate-50">
                        {r.is_active ? "Hide" : "Show"}
                      </button>
                      <button type="button" onClick={() => void remove(r)} className="rounded-full border border-red-200 px-3 py-1.5 text-red-700 hover:bg-red-50">Remove</button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
            <input ref={replaceInput} type="file" className="hidden" onChange={(e) => void doReplace(e.target.files?.[0])} />
          </div>
        </>
      )}

      {preview && (
        <TrialViewer
          resources={resources}
          initialId={preview}
          onClose={() => setPreview(null)}
          banner={<div className="shrink-0 bg-amber-50 px-4 py-1.5 text-center text-xs font-medium text-amber-800">Admin preview — students only see resources marked VISIBLE, and only after you publish the trial.</div>}
        />
      )}
    </div>
  );
}
