import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { IconDoc, IconPencil, IconPlay } from "../Icons";
import { loadHtmlApp } from "../../lib/htmlPackage";
import {
  TRIAL_TYPE_LABEL,
  TRIAL_TYPE_ORDER,
  trialPublicUrl,
  type TrialResource,
  type TrialResourceType,
} from "../../lib/trial";

const IconImage = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <circle cx="9" cy="10" r="1.6" />
    <path d="m21 16-5-5-8 9" />
  </svg>
);

export function TypeIcon({ type }: { type: TrialResourceType }) {
  if (type === "video") return <IconPlay />;
  if (type === "pdf") return <IconDoc />;
  if (type === "image") return <IconImage />;
  return <IconPencil />;
}

function Spinner({ label }: { label: string }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-paper text-sm text-ink/60" role="status">
      <div className="trial-skeleton h-1.5 w-40 rounded-full" />
      <span>{label}</span>
    </div>
  );
}

function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex h-full min-h-[240px] flex-col items-center justify-center gap-3 p-6 text-center" role="alert">
      <p className="max-w-md text-[15px] text-red-700">{message}</p>
      {onRetry && (
        <button type="button" className="btn-secondary" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  );
}

function fullscreen(el: HTMLElement | null) {
  if (!el) return;
  if (document.fullscreenElement) void document.exitFullscreen();
  else if (el.requestFullscreen) void el.requestFullscreen().catch(() => undefined);
}

/* ------------------------------------------------------------------ HTML */

function HtmlViewer({ resource }: { resource: TrialResource }) {
  const [html, setHtml] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [key, setKey] = useState(0);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctrl = new AbortController();
    setHtml(null);
    setError(null);
    loadHtmlApp(trialPublicUrl(resource.storage_path), ctrl.signal)
      .then(setHtml)
      .catch((e) => {
        if (ctrl.signal.aborted) return;
        console.error("Trial HTML app failed:", e);
        setError(e instanceof Error ? e.message : "This app could not be opened.");
      });
    return () => ctrl.abort();
  }, [resource.storage_path, key]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 items-center justify-end gap-2 border-b border-line bg-white px-3 py-2">
        <button type="button" className="btn-ghost h-9 px-3 text-sm" onClick={() => setKey((k) => k + 1)}>
          ↻ Reload
        </button>
        <button type="button" className="btn-ghost h-9 px-3 text-sm" onClick={() => fullscreen(box.current)}>
          ⛶ Fullscreen
        </button>
      </div>
      <div ref={box} className="relative min-h-0 flex-1 bg-white">
        {error ? (
          <ErrorBox message={error} onRetry={() => setKey((k) => k + 1)} />
        ) : html === null ? (
          <Spinner label="Opening the app…" />
        ) : (
          <iframe
            key={key}
            title={resource.title}
            srcDoc={html}
            // No allow-same-origin on purpose: the app runs in an isolated origin and cannot
            // read this website's login session, cookies or storage.
            sandbox="allow-scripts allow-forms allow-modals allow-popups allow-pointer-lock"
            referrerPolicy="no-referrer"
            allow="fullscreen"
            className="h-full w-full border-0 bg-white"
          />
        )}
      </div>
    </div>
  );
}

/* ----------------------------------------------------------------- Video */

function VideoViewer({ resource }: { resource: TrialResource }) {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(false);
  const [key, setKey] = useState(0);
  const poster = resource.thumbnail_path ? trialPublicUrl(resource.thumbnail_path) : undefined;
  return (
    <div className="relative flex h-full min-h-[260px] items-center justify-center bg-black">
      {error ? (
        <div className="bg-white">
          <ErrorBox
            message="This video could not be played. Your browser may not support its format, or the connection dropped."
            onRetry={() => {
              setError(false);
              setReady(false);
              setKey((k) => k + 1);
            }}
          />
        </div>
      ) : (
        <>
          {!ready && <Spinner label="Loading video…" />}
          <video
            key={key}
            controls
            playsInline
            preload="metadata"
            poster={poster}
            src={trialPublicUrl(resource.storage_path)}
            onLoadedMetadata={() => setReady(true)}
            onError={() => setError(true)}
            className="max-h-full w-full"
          >
            Your browser cannot play this video.
          </video>
        </>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------- PDF */

function PdfViewer({ resource }: { resource: TrialResource }) {
  const url = trialPublicUrl(resource.storage_path);
  const [loaded, setLoaded] = useState(false);
  // Phones and tablets usually cannot show a PDF inside a page, so offer a clear button instead.
  const inlineOk = useMemo(
    () => typeof window !== "undefined" && !window.matchMedia("(pointer: coarse)").matches,
    [],
  );
  const box = useRef<HTMLDivElement>(null);

  const actions = (
    <div className="flex flex-wrap items-center justify-center gap-2">
      <a href={url} target="_blank" rel="noopener noreferrer" className="btn-primary h-10 px-4 text-sm">
        Open PDF
      </a>
      <a href={url} download className="btn-secondary h-10 px-4 text-sm">
        Download
      </a>
    </div>
  );

  if (!inlineOk) {
    return (
      <div className="flex h-full min-h-[260px] flex-col items-center justify-center gap-4 p-6 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
          <IconDoc width={28} height={28} />
        </div>
        <p className="max-w-sm text-ink/70">Tap below to read this PDF. It opens in your phone's own PDF viewer.</p>
        {actions}
      </div>
    );
  }
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-line bg-white px-3 py-2">
        <span className="text-xs text-ink/55">Use the viewer's own toolbar for pages and zoom.</span>
        <div className="flex gap-2">
          <button type="button" className="btn-ghost h-9 px-3 text-sm" onClick={() => fullscreen(box.current)}>
            ⛶ Fullscreen
          </button>
          <a href={url} target="_blank" rel="noopener noreferrer" className="btn-ghost h-9 px-3 text-sm">
            Open in new tab
          </a>
        </div>
      </div>
      <div ref={box} className="relative min-h-0 flex-1 bg-paper">
        {!loaded && <Spinner label="Loading PDF…" />}
        <iframe
          title={resource.title}
          src={`${url}#toolbar=1&navpanes=0`}
          onLoad={() => setLoaded(true)}
          className="h-full w-full border-0"
        />
      </div>
      <div className="shrink-0 border-t border-line bg-white px-3 py-2 text-center text-xs text-ink/55">
        PDF not showing? {actions}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- Images */

function ImageViewer({ images, startId }: { images: TrialResource[]; startId: string }) {
  const [index, setIndex] = useState(Math.max(0, images.findIndex((i) => i.id === startId)));
  const [loaded, setLoaded] = useState<Record<string, boolean>>({});
  const [failed, setFailed] = useState<Record<string, boolean>>({});
  const [zoom, setZoom] = useState(false);
  const cur = images[index] ?? images[0];

  const go = useCallback(
    (d: number) => {
      setZoom(false);
      setIndex((i) => (i + d + images.length) % images.length);
    },
    [images.length],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") go(1);
      else if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go]);

  if (!cur) return null;
  const url = trialPublicUrl(cur.storage_path);
  return (
    <div className="flex h-full min-h-0 flex-col bg-ink">
      <div className={`relative min-h-0 flex-1 ${zoom ? "overflow-auto" : "flex items-center justify-center overflow-hidden"}`}>
        {!loaded[cur.id] && !failed[cur.id] && <div className="trial-skeleton absolute inset-6 rounded-2xl opacity-40" />}
        {failed[cur.id] ? (
          <div className="rounded-xl bg-white">
            <ErrorBox message="This image could not be loaded." />
          </div>
        ) : (
          <img
            key={cur.id}
            src={url}
            alt={cur.title}
            loading="lazy"
            onLoad={() => setLoaded((s) => ({ ...s, [cur.id]: true }))}
            onError={() => setFailed((s) => ({ ...s, [cur.id]: true }))}
            onClick={() => setZoom((z) => !z)}
            className={`trial-fade ${zoom ? "max-w-none cursor-zoom-out" : "max-h-full max-w-full cursor-zoom-in object-contain"}`}
            style={zoom ? { width: "180%" } : undefined}
          />
        )}
        {images.length > 1 && (
          <>
            <button type="button" aria-label="Previous image" onClick={() => go(-1)} className="trial-nav left-2">
              ‹
            </button>
            <button type="button" aria-label="Next image" onClick={() => go(1)} className="trial-nav right-2">
              ›
            </button>
          </>
        )}
      </div>
      <div className="shrink-0 bg-white px-3 py-2">
        <div className="flex items-center justify-between gap-3 text-sm">
          <span className="truncate font-semibold">{cur.title}</span>
          <span className="shrink-0 text-ink/50">
            {index + 1} / {images.length} · tap image to zoom
          </span>
        </div>
        {images.length > 1 && (
          <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
            {images.map((im, i) => (
              <button
                key={im.id}
                type="button"
                onClick={() => {
                  setZoom(false);
                  setIndex(i);
                }}
                aria-label={`Show ${im.title}`}
                className={`h-14 w-20 shrink-0 overflow-hidden rounded-lg border-2 ${i === index ? "border-brand-500" : "border-transparent opacity-70"}`}
              >
                <img src={trialPublicUrl(im.thumbnail_path || im.storage_path)} alt="" loading="lazy" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ----------------------------------------------------------- The overlay */

export function TrialViewer({
  resources,
  initialId,
  onClose,
  banner,
}: {
  resources: TrialResource[];
  initialId?: string;
  onClose: () => void;
  banner?: ReactNode;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(
    initialId ?? (resources.length === 1 ? resources[0].id : null),
  );
  const selected = resources.find((r) => r.id === selectedId) ?? null;
  const dialog = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !document.fullscreenElement) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  const groups = TRIAL_TYPE_ORDER.map((t) => ({ type: t, items: resources.filter((r) => r.resource_type === t) })).filter(
    (g) => g.items.length > 0,
  );
  const canGoBack = !!selected && resources.length > 1;

  return (
    <div className="trial-overlay fixed inset-0 z-[60] flex items-stretch justify-center bg-ink/70 backdrop-blur-sm sm:items-center sm:p-6" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        ref={dialog}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label="Free preview"
        className="trial-dialog flex h-full w-full max-w-5xl flex-col overflow-hidden bg-white shadow-deep outline-none sm:h-[88vh] sm:rounded-3xl"
      >
        <div className="flex shrink-0 items-center gap-2 border-b border-line bg-white px-3 py-2.5 sm:px-5">
          {canGoBack ? (
            <button type="button" onClick={() => setSelectedId(null)} className="btn-ghost h-10 px-3 text-sm">
              ← Back
            </button>
          ) : null}
          <div className="min-w-0 flex-1">
            <div className="truncate font-display text-base font-bold sm:text-lg">{selected ? selected.title : "Free preview"}</div>
            <div className="text-xs text-ink/50">{selected ? TRIAL_TYPE_LABEL[selected.resource_type] : "Pick anything to try it"}</div>
          </div>
          <button type="button" onClick={onClose} className="btn-secondary h-10 px-4 text-sm" aria-label="Close preview">
            ✕ Close
          </button>
        </div>
        {banner}
        <div className="min-h-0 flex-1 overflow-hidden bg-paper">
          {selected ? (
            <div key={selected.id} className="trial-fade h-full">
              {selected.resource_type === "html_app" && <HtmlViewer resource={selected} />}
              {selected.resource_type === "video" && <VideoViewer resource={selected} />}
              {selected.resource_type === "pdf" && <PdfViewer resource={selected} />}
              {selected.resource_type === "image" && (
                <ImageViewer images={resources.filter((r) => r.resource_type === "image")} startId={selected.id} />
              )}
            </div>
          ) : (
            <div className="h-full overflow-y-auto p-4 sm:p-6">
              {groups.length === 0 && <p className="text-center text-ink/60">Nothing to preview yet.</p>}
              {groups.map((g) => (
                <section key={g.type} className="mb-6 last:mb-0">
                  <h3 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-ink/55">
                    <TypeIcon type={g.type} /> {TRIAL_TYPE_LABEL[g.type]}
                  </h3>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {g.items.map((r) => (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => setSelectedId(r.id)}
                        className="trial-res flex items-center gap-3 rounded-2xl border border-line bg-white p-3 text-left"
                      >
                        <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-brand-50 text-brand-600">
                          {r.thumbnail_path || r.resource_type === "image" ? (
                            <img src={trialPublicUrl(r.thumbnail_path || r.storage_path)} alt="" loading="lazy" className="h-full w-full object-cover" />
                          ) : (
                            <TypeIcon type={r.resource_type} />
                          )}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-semibold">{r.title}</span>
                          {r.description && <span className="mt-0.5 line-clamp-2 block text-sm text-ink/60">{r.description}</span>}
                        </span>
                        {!r.is_active && <span className="rounded-md bg-marigold-50 px-1.5 py-0.5 text-[11px] font-bold text-marigold-600">HIDDEN</span>}
                      </button>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
