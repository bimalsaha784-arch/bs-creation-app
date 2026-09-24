/**
 * ============================================================
 *  BS CREATION — BRAND CONFIGURATION
 * ============================================================
 *  Change your logo, name, tagline and support email HERE.
 *  Every page (navbar, login, dashboard, course pages, checkout,
 *  mobile menu, footer) reads from this one file.
 *
 *  TO REPLACE THE LOGO:
 *    Option A (easiest): overwrite  public/assets/logo.png  with your
 *                        own image, keeping the same file name.
 *    Option B: put your file in public/assets/ and change `logo` below,
 *              e.g.  logo: "/assets/my-new-logo.svg"
 *
 *  If your logo image already contains the words "BS Creation",
 *  set `showWordmark: false` so the name isn't shown twice.
 *
 *  If you have a separate white/light version of the logo for dark
 *  backgrounds (used in the footer), set `logoOnDark` to its path.
 *  Otherwise the normal logo is shown on a small white tile.
 * ============================================================
 */
export const BRAND = {
  name: "BS Creation",
  tagline: "Notes, practice and mock tests for serious exam prep.",

  /** Main logo — square images look best (recommended 256×256 PNG or SVG). */
  logo: "/assets/logo.png",

  /** Optional light logo for dark backgrounds (footer). null = use `logo` on a white tile. */
  logoOnDark: null as string | null,

  /** Show the "BS Creation" text next to the logo image. */
  showWordmark: true,

  supportEmail: "support@bscreation.example",

  /** Colour used inside the Razorpay checkout popup. */
  checkoutThemeColor: "#1F4D3A",
};
