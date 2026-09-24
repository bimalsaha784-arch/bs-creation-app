import type { ReactNode } from "react";
import { Logo } from "./Logo";
import { IconCheck } from "./Icons";

/** Shared layout for Login / Register: brand panel on desktop, clean single column on mobile. */
export function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <div className="page grid min-h-[calc(100vh-64px)] items-stretch gap-10 py-8 sm:py-12 lg:grid-cols-2 lg:py-16">
      <div className="chalk-grid hidden flex-col justify-between rounded-3xl bg-brand-700 p-10 text-white lg:flex">
        <Logo tone="dark" size="lg" to={null} />
        <div>
          <p className="font-display text-3xl font-bold leading-tight text-white">
            All your courses, notes, practice sets and mock tests under one login.
          </p>
          <ul className="mt-6 space-y-3 text-white/80">
            {["Buy more courses any time — earlier ones stay unlocked", "Continue exactly where you stopped", "Works on phone, tablet and laptop"].map((t) => (
              <li key={t} className="flex items-start gap-2.5">
                <IconCheck width={18} height={18} className="mt-0.5 shrink-0 text-marigold-300" /> {t}
              </li>
            ))}
          </ul>
        </div>
        <span className="h-1.5 w-16 rounded-full bg-marigold-400" />
      </div>

      <div className="flex items-center justify-center">
        <div className="w-full max-w-md">
          <div className="lg:hidden">
            <Logo size="lg" to={null} />
          </div>
          <h1 className="mt-6 font-display text-3xl font-extrabold lg:mt-0">{title}</h1>
          <p className="mt-2 text-ink/65">{subtitle}</p>
          <div className="mt-8">{children}</div>
        </div>
      </div>
    </div>
  );
}

export function GoogleButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="btn-secondary h-12 w-full text-[15px]">
      <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
        <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/>
        <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
        <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/>
        <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/>
      </svg>
      Continue with Google
    </button>
  );
}

export function OrDivider() {
  return (
    <div className="my-6 flex items-center gap-3 text-xs font-medium text-ink/40">
      <div className="h-px flex-1 bg-line" /> or use email <div className="h-px flex-1 bg-line" />
    </div>
  );
}
