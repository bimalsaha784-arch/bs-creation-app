import { useState } from "react";
import { Link } from "react-router-dom";
import { BRAND } from "../config/brand";

type Size = "sm" | "md" | "lg";
const IMG: Record<Size, string> = { sm: "h-8 w-8", md: "h-9 w-9", lg: "h-12 w-12" };
const TEXT: Record<Size, string> = { sm: "text-base", md: "text-lg", lg: "text-2xl" };

/**
 * The BS Creation logo. Reads everything from src/config/brand.ts —
 * never hard-code a logo path anywhere else.
 *
 * tone="dark" is for dark (green) backgrounds such as the footer.
 */
export function Logo({
  size = "md",
  tone = "light",
  to = "/",
  showWordmark = BRAND.showWordmark,
}: {
  size?: Size;
  tone?: "light" | "dark";
  to?: string | null;
  showWordmark?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const src = tone === "dark" && BRAND.logoOnDark ? BRAND.logoOnDark : BRAND.logo;
  const needsTile = tone === "dark" && !BRAND.logoOnDark;

  const mark = failed ? (
    // Fallback if the logo file is missing — the site still looks right.
    <span
      className={`${IMG[size]} inline-flex shrink-0 items-center justify-center rounded-lg bg-brand-700 font-display text-[13px] font-bold text-white`}
    >
      BS
    </span>
  ) : (
    <span className={`${needsTile ? "rounded-lg bg-white p-0.5" : ""} inline-flex shrink-0`}>
      <img
        src={src}
        alt={showWordmark ? "" : BRAND.name}
        className={`${IMG[size]} rounded-lg object-contain`}
        onError={() => setFailed(true)}
      />
    </span>
  );

  const content = (
    <span className="inline-flex items-center gap-2.5">
      {mark}
      {showWordmark && (
        <span
          className={`${TEXT[size]} font-display font-bold tracking-tight ${
            tone === "dark" ? "text-white" : "text-ink"
          }`}
        >
          {BRAND.name}
        </span>
      )}
    </span>
  );

  if (to === null) return content;
  return (
    <Link to={to} className="inline-flex rounded-lg" aria-label={`${BRAND.name} home`}>
      {content}
    </Link>
  );
}
