import { useCallback, useEffect, useState } from "react";
import { fetchTrialResources, TRIAL_TYPE_ORDER, type TrialResource, type TrialResourceType } from "../../lib/trial";
import { TrialViewer, TypeIcon } from "./TrialViewer";

const CHIP_LABEL: Record<TrialResourceType, [string, string]> = {
  html_app: ["interactive app", "interactive apps"],
  video: ["video", "videos"],
  pdf: ["PDF", "PDFs"],
  image: ["image", "images"],
};

/**
 * "TRY FREE BEFORE YOU BUY" — one reusable block that works for every course.
 * It only needs the course id; resources are loaded from the database, so a new course
 * automatically supports it once the admin adds previews. If the trial is switched off,
 * has nothing in it, or fails to load, it renders nothing and the page stays as it was.
 */
export function CourseTrial({ courseId, enabled }: { courseId: string; enabled: boolean }) {
  const [resources, setResources] = useState<TrialResource[]>([]);
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    let active = true;
    setResources([]);
    if (!enabled) return;
    fetchTrialResources(courseId, true)
      .then((r) => active && setResources(r))
      .catch((e) => console.error("CourseTrial: could not load previews:", e));
    return () => {
      active = false;
    };
  }, [courseId, enabled]);

  if (!enabled || resources.length === 0) return null;

  const counts = TRIAL_TYPE_ORDER.map((t) => ({ t, n: resources.filter((r) => r.resource_type === t).length })).filter((c) => c.n > 0);

  return (
    <>
      <section className="border-b border-line bg-white">
        <div className="page py-6 sm:py-8">
          <div className="trial-card relative overflow-hidden rounded-3xl p-5 text-white sm:p-8">
            <div className="relative z-10 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <span className="inline-flex items-center rounded-full bg-marigold-400 px-3 py-1 text-[11px] font-extrabold tracking-wider text-ink">
                  FREE PREVIEW
                </span>
                <h2 className="mt-3 font-display text-2xl font-extrabold leading-tight text-white sm:text-3xl">TRY FREE BEFORE YOU BUY</h2>
                <p className="mt-2 max-w-xl text-[15px] text-white/80">
                  Explore sample lessons, interactive apps, videos, PDFs and images before purchasing.
                </p>
                <ul className="mt-4 flex flex-wrap gap-2">
                  {counts.map((c) => (
                    <li key={c.t} className="inline-flex items-center gap-1.5 rounded-full bg-white/12 px-3 py-1 text-xs font-semibold text-white/90 ring-1 ring-white/20">
                      <TypeIcon type={c.t} /> {c.n} {CHIP_LABEL[c.t][c.n === 1 ? 0 : 1]}
                    </li>
                  ))}
                </ul>
              </div>
              <button type="button" onClick={() => setOpen(true)} className="trial-btn shrink-0">
                <span aria-hidden="true">✨</span> TRY FREE FOR TRIAL
              </button>
            </div>
          </div>
        </div>
      </section>
      {open && <TrialViewer resources={resources} onClose={close} />}
    </>
  );
}
