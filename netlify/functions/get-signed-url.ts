import type { Handler } from "@netlify/functions";
import { supabaseAdmin, getAuthedUser, isAdmin, json } from "./utils/supabaseAdmin";

/**
 * GET /api/get-signed-url?lessonId=...
 *
 * This is the ONLY way protected lesson content (PDF, HTML application bundle,
 * or video file) is ever reachable. It never trusts a URL typed by hand, a
 * frontend flag, or localStorage — it re-derives everything from the database
 * on every call:
 *
 *   authenticated user? -> active enrollment in the course? -> lesson really
 *   belongs to that course? -> short-lived signed URL (default 5 minutes).
 *
 * For content_type = 'html_app', content_reference should point at a single
 * bundled entry file (e.g. a zipped/self-contained index.html with inlined
 * assets) stored in the private bucket. See SECURITY.md for the documented
 * limitation around multi-file HTML apps referencing sibling assets.
 */
export const handler: Handler = async (event) => {
  if (event.httpMethod !== "GET") return json(405, { error: "Method not allowed" });

  const user = await getAuthedUser(event.headers.authorization);
  if (!user) return json(401, { error: "Not authenticated" });

  const lessonId = event.queryStringParameters?.lessonId;
  if (!lessonId) return json(400, { error: "lessonId is required" });

  const { data: lesson, error: lessonErr } = await supabaseAdmin
    .from("lessons")
    .select("id, content_type, content_reference, status, module_id")
    .eq("id", lessonId)
    .single();
  if (lessonErr || !lesson) return json(404, { error: "Lesson not found" });

  const { data: moduleRow, error: moduleErr } = await supabaseAdmin
    .from("modules")
    .select("id, course_id")
    .eq("id", lesson.module_id)
    .single();
  if (moduleErr || !moduleRow) return json(404, { error: "Course not found for lesson" });

  const admin = await isAdmin(user.id);

  if (!admin) {
    const { data: enrollment } = await supabaseAdmin
      .from("enrollments")
      .select("id, status, expires_at")
      .eq("user_id", user.id)
      .eq("course_id", moduleRow.course_id)
      .eq("status", "active")
      .maybeSingle();

    const active =
      !!enrollment && (!enrollment.expires_at || new Date(enrollment.expires_at) > new Date());

    if (!active) return json(403, { error: "You do not have access to this lesson" });
  }

  if (!lesson.content_reference) return json(404, { error: "Content not available" });

  // Enforce the admin-configurable "allow download" flag for PDFs by controlling
  // the Content-Disposition Razorpay^H^H Supabase signed URL is served with.
  const { data: course } = await supabaseAdmin
    .from("courses")
    .select("allow_pdf_download")
    .eq("id", moduleRow.course_id)
    .single();

  const expiresInSeconds = 60 * 5; // 5-minute signed URL
  const { data: signed, error: signErr } = await supabaseAdmin.storage
    .from("course-files")
    .createSignedUrl(lesson.content_reference, expiresInSeconds, {
      download: lesson.content_type === "pdf" && course?.allow_pdf_download ? true : false,
    });

  if (signErr || !signed) return json(500, { error: "Could not generate access URL" });

  return json(200, {
    url: signed.signedUrl,
    contentType: lesson.content_type,
    expiresInSeconds,
  });
};
