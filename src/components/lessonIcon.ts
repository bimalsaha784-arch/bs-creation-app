import type { Lesson } from "../types";
import { isMockLesson } from "../lib/catalog";
import { IconDoc, IconPencil, IconPlay, IconText, IconTimer } from "./Icons";

/** Icon for a lesson based on its type (PDF, practice, mock test, video, text). */
export function lessonIcon(l: Pick<Lesson, "title" | "content_type">) {
  if (l.content_type === "pdf") return IconDoc;
  if (l.content_type === "video") return IconPlay;
  if (l.content_type === "text") return IconText;
  return isMockLesson(l) ? IconTimer : IconPencil;
}
