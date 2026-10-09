import { supabase } from "./supabaseClient";

export type TrialResourceType = "html_app" | "video" | "pdf" | "image";

export interface TrialResource {
  id: string;
  course_id: string;
  title: string;
  description: string | null;
  resource_type: TrialResourceType;
  storage_path: string;
  thumbnail_path: string | null;
  position: number;
  is_active: boolean;
}

export const TRIAL_BUCKET = "course-trials";

export const TRIAL_TYPE_LABEL: Record<TrialResourceType, string> = {
  html_app: "Interactive apps",
  video: "Videos",
  pdf: "PDFs",
  image: "Images",
};

export const TRIAL_TYPE_ORDER: TrialResourceType[] = ["html_app", "video", "pdf", "image"];

const MB = 1024 * 1024;

/** What the admin may upload for each type (checked before the upload starts). */
export const TRIAL_RULES: Record<
  TrialResourceType,
  { label: string; accept: string; exts: string[]; maxBytes: number; hint: string }
> = {
  html_app: {
    label: "HTML application",
    accept: ".html,.htm,.zip",
    exts: ["html", "htm", "zip"],
    maxBytes: 25 * MB,
    hint: "One .html file, or a .zip with index.html plus its CSS / JS / images (max 25 MB).",
  },
  video: {
    label: "Video",
    accept: ".mp4,.webm,.mov,.m4v",
    exts: ["mp4", "webm", "mov", "m4v"],
    maxBytes: 50 * MB,
    hint: "MP4 or WebM (max 50 MB).",
  },
  pdf: {
    label: "PDF",
    accept: ".pdf,application/pdf",
    exts: ["pdf"],
    maxBytes: 50 * MB,
    hint: "A PDF file (max 50 MB).",
  },
  image: {
    label: "Image(s)",
    accept: ".jpg,.jpeg,.png,.webp,.gif",
    exts: ["jpg", "jpeg", "png", "webp", "gif"],
    maxBytes: 10 * MB,
    hint: "JPG, PNG, WebP or GIF. You can pick several at once (max 10 MB each).",
  },
};

export function fileExt(name: string): string {
  const i = name.lastIndexOf(".");
  return i < 0 ? "" : name.slice(i + 1).toLowerCase();
}

/** Returns an error message, or null when the file is acceptable. */
export function validateTrialFile(type: TrialResourceType, file: File): string | null {
  const rule = TRIAL_RULES[type];
  if (!rule.exts.includes(fileExt(file.name))) {
    return `"${file.name}" is not allowed here. ${rule.hint}`;
  }
  if (file.size === 0) return `"${file.name}" is empty.`;
  if (file.size > rule.maxBytes) {
    return `"${file.name}" is ${(file.size / MB).toFixed(1)} MB. The limit for ${rule.label.toLowerCase()} is ${Math.round(
      rule.maxBytes / MB,
    )} MB.`;
  }
  return null;
}

export function trialPublicUrl(path: string | null | undefined): string {
  if (!path) return "";
  return supabase.storage.from(TRIAL_BUCKET).getPublicUrl(path).data.publicUrl;
}

export function safeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(-80) || "file";
}

export function newTrialPath(courseId: string, fileName: string): string {
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  return `${courseId}/${id}-${safeFileName(fileName)}`;
}

export async function fetchTrialResources(courseId: string, onlyActive: boolean): Promise<TrialResource[]> {
  let q = supabase
    .from("course_trial_resources")
    .select("*")
    .eq("course_id", courseId)
    .order("position", { ascending: true })
    .order("created_at", { ascending: true });
  if (onlyActive) q = q.eq("is_active", true);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as TrialResource[];
}

/**
 * Upload with a real progress bar. supabase-js cannot report upload progress, so this
 * talks to the Storage REST endpoint directly, using the admin's own login session
 * (the same RLS rules apply: only admins can write to this bucket).
 */
export async function uploadTrialFile(
  path: string,
  file: File,
  onProgress: (pct: number) => void,
): Promise<void> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("You are not logged in.");
  const base = import.meta.env.VITE_SUPABASE_URL as string;
  const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
  const url = `${base}/storage/v1/object/${TRIAL_BUCKET}/${path.split("/").map(encodeURIComponent).join("/")}`;

  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);
    xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    xhr.setRequestHeader("apikey", anon);
    xhr.setRequestHeader("x-upsert", "false");
    if (file.type) xhr.setRequestHeader("Content-Type", file.type);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress(100);
        resolve();
        return;
      }
      let msg = `Upload failed (${xhr.status}).`;
      try {
        const j = JSON.parse(xhr.responseText);
        if (j?.message) msg = `Upload failed: ${j.message}`;
      } catch {
        /* keep default */
      }
      reject(new Error(msg));
    };
    xhr.onerror = () => reject(new Error("Network error while uploading. Please try again."));
    xhr.onabort = () => reject(new Error("Upload cancelled."));
    xhr.send(file);
  });
}

export async function removeTrialFiles(paths: (string | null | undefined)[]): Promise<void> {
  const list = paths.filter((p): p is string => !!p);
  if (list.length === 0) return;
  const { error } = await supabase.storage.from(TRIAL_BUCKET).remove(list);
  if (error) console.error("Could not delete old trial file(s):", error);
}
