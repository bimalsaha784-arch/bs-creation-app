import { useEffect, useRef } from "react";
import type { CSSProperties, ReactNode } from "react";
import { IconCheck, IconDoc, IconPencil, IconTimer } from "./Icons";

/**
 * The 3D picture on the home page hero: a stack of books that turns slightly
 * with the mouse, with a sample practice question and feature chips floating
 * in front. Pure CSS 3D — no extra packages, nothing to download.
 */
export function HeroScene() {
  const stageRef = useRef<HTMLDivElement>(null);

  // Desktop only: let the books follow the mouse a little.
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const canHover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!canHover || reduce) return;

    let raf = 0;
    const onMove = (e: PointerEvent) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const px = e.clientX / window.innerWidth - 0.5;
        const py = e.clientY / window.innerHeight - 0.5;
        el.style.setProperty("--ry", `${(px * 22).toFixed(2)}deg`);
        el.style.setProperty("--rx", `${(-py * 14).toFixed(2)}deg`);
      });
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div
      className="scene3d relative mx-auto h-[450px] w-full max-w-[540px] select-none sm:h-[440px] lg:h-[510px]"
      aria-hidden="true"
    >
      {/* soft glow behind the books */}
      <div className="absolute left-[56%] top-[34%] h-[260px] w-[260px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-400/40 blur-3xl sm:top-[50%] sm:h-[380px] sm:w-[380px]" />

      {/* 3D books */}
      <div className="scene-scale absolute inset-0 [--sc:0.72] [--sx:62%] [--sy:35%] sm:[--sc:0.9] sm:[--sy:52%] lg:[--sc:1.12] lg:[--sx:57%] lg:[--sy:57%]">
        <div ref={stageRef} className="scene-stage">
          <div className="scene-shadow" />
          <Book w={230} h={34} d={158} y={64} rot={4} cover="#173A80" label="BS Creation" />
          <Book w={208} h={30} d={146} y={26} rot={-9} cover="#FDB913" dark label="Notes" />
          <Book w={186} h={28} d={134} y={-8} rot={7} cover="#EAF0FC" dark label="Practice" />
          <Book w={160} h={24} d={118} y={-38} rot={-4} cover="#2F5FC4" label="Mock tests" />
        </div>
      </div>

      {/* floating practice question */}
      <div className="float-card absolute bottom-0 left-0 w-[188px] sm:bottom-auto sm:top-[3%] rounded-2xl bg-white p-3.5 text-ink sm:w-[250px] sm:p-4">
        <div className="flex items-center justify-between text-[10px] font-semibold text-ink/55 sm:text-xs">
          <span>Sample question 14 of 50</span>
          <span className="inline-flex items-center gap-1 rounded-md bg-marigold-50 px-1.5 py-0.5 text-marigold-600">
            <IconTimer width={12} height={12} /> 32:10
          </span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-brand-50">
          <div className="h-full w-[28%] rounded-full bg-brand-500" />
        </div>
        <p className="mt-3 text-[13px] font-semibold leading-snug sm:text-sm">
          Which gas do green plants take in during photosynthesis?
        </p>
        <ul className="mt-2.5 space-y-1.5 text-[12px] sm:text-[13px]">
          {["Oxygen", "Carbon dioxide", "Nitrogen"].map((o, i) => (
            <li
              key={o}
              className={`flex items-center gap-2 rounded-lg border px-2.5 py-1.5 ${i === 1 ? "q-correct border-line" : "border-line"}`}
            >
              <span className="flex h-5 w-5 items-center justify-center rounded-md bg-paper text-[10px] font-bold text-ink/60">
                {String.fromCharCode(65 + i)}
              </span>
              <span className="flex-1">{o}</span>
              {i === 1 && (
                <span className="q-tick flex h-5 w-5 items-center justify-center rounded-full bg-brand-500 text-white">
                  <IconCheck width={12} height={12} strokeWidth={2.8} />
                </span>
              )}
            </li>
          ))}
        </ul>
      </div>

      {/* floating chips */}
      <Chip className="left-[2%] top-[3%] sm:left-auto sm:right-0 sm:top-[2%]" delay="0s" icon={<IconDoc width={16} height={16} />} text="PDF notes" />
      <Chip className="right-0 top-[3%] sm:top-[34%]" delay="1.2s" icon={<IconPencil width={16} height={16} />} text="Practice sets" />
      <Chip className="bottom-[3%] right-0 sm:bottom-[10%] sm:left-[4%] sm:right-auto" delay="2.1s" icon={<IconTimer width={16} height={16} />} text="Mock tests" />
    </div>
  );
}

function Chip({ className, delay, icon, text }: { className: string; delay: string; icon: ReactNode; text: string }) {
  return (
    <div
      className={`float-chip absolute inline-flex items-center gap-2 rounded-2xl bg-white/95 px-3 py-2 text-[12px] font-bold text-brand-800 shadow-lift sm:text-[13px] ${className}`}
      style={{ "--delay": delay } as CSSProperties}
    >
      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-50 text-brand-600">{icon}</span>
      {text}
    </div>
  );
}

function Book({
  w, h, d, y, rot, cover, label, dark,
}: {
  w: number; h: number; d: number; y: number; rot: number; cover: string; label: string; dark?: boolean;
}) {
  const style = {
    "--w": `${w}px`, "--h": `${h}px`, "--d": `${d}px`, "--y": `${y}px`, "--rot": `${rot}deg`, "--cover": cover,
  } as CSSProperties;
  return (
    <div className="book3d" style={style}>
      <i className="bf f-front pages" />
      <i className="bf f-back pages" />
      <i className="bf f-right pages" />
      <i className="bf f-left spine" />
      <i className="bf f-bottom cover" />
      <i className="bf f-top cover">
        <span
          className={`absolute inset-x-0 top-[18%] text-center font-display text-[22px] font-extrabold tracking-tight ${dark ? "text-brand-900" : "text-white"}`}
        >
          {label}
        </span>
        <span className="absolute bottom-[20%] left-1/2 h-[5px] w-[44%] -translate-x-1/2 rounded-full bg-marigold-400" />
      </i>
    </div>
  );
}
