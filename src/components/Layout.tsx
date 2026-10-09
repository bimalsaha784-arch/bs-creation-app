import { useEffect, useRef, useState } from "react";
import type { SVGProps } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { BRAND } from "../config/brand";
import { firstName } from "../lib/format";
import { Logo } from "./Logo";
import { ErrorBoundary } from "./ErrorBoundary";
import { IconChevronDown, IconClose, IconLayers, IconMenu, IconPlay, IconSearch, IconUser } from "./Icons";

type NavItem = { to: string; label: string; end?: boolean; hash?: string };

const PUBLIC_NAV: NavItem[] = [
  { to: "/", label: "Home", end: true },
  { to: "/courses", label: "Courses" },
  { to: "/dashboard#my-courses", label: "My Courses", hash: "#my-courses" },
  { to: "/about", label: "About" },
];

const STUDENT_NAV: NavItem[] = [
  { to: "/dashboard", label: "Dashboard", end: true },
  { to: "/dashboard#my-courses", label: "My Courses", hash: "#my-courses" },
  { to: "/courses", label: "Explore Courses" },
  { to: "/about", label: "About" },
];

/** Scroll to top on page change, or to #section when the URL has a hash (content loads async, so retry briefly). */
function ScrollManager() {
  const { pathname, hash, key } = useLocation();
  useEffect(() => {
    if (!hash) {
      window.scrollTo({ top: 0 });
      return;
    }
    let tries = 0;
    const id = window.setInterval(() => {
      const el = document.getElementById(hash.slice(1));
      if (el || ++tries > 20) {
        window.clearInterval(id);
        el?.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 80);
    return () => window.clearInterval(id);
  }, [pathname, hash, key]);
  return null;
}

export function Layout() {
  const { session, profile, user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  const nav = session ? STUDENT_NAV : PUBLIC_NAV;
  // Phone tab bar only on the main browsing pages (not on course detail / lesson pages, which have their own bottom bars).
  const showTabs = ["/", "/courses", "/dashboard", "/profile"].includes(location.pathname);
  const displayName = firstName(profile?.full_name) || user?.email?.split("@")[0] || "Account";

  // Close menus on navigation
  useEffect(() => {
    setMenuOpen(false);
    setProfileOpen(false);
  }, [location.pathname, location.hash]);

  // Lock page scroll behind the mobile menu
  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  // Close profile dropdown on outside click / Escape
  useEffect(() => {
    if (!profileOpen) return;
    const onClick = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setProfileOpen(false);
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [profileOpen]);

  async function handleSignOut() {
    await signOut();
    navigate("/");
  }

  function isActive(item: NavItem) {
    const path = item.to.split("#")[0];
    if (item.hash) return location.pathname === path && location.hash === item.hash;
    if (item.end) return location.pathname === path && !location.hash;
    return location.pathname.startsWith(path);
  }

  const linkCls = (active: boolean) =>
    `rounded-lg px-3 py-2 text-[15px] font-medium transition-colors ${
      active ? "bg-brand-50 text-brand-700" : "text-ink/70 hover:bg-brand-50/60 hover:text-ink"
    }`;

  return (
    <div className={`flex min-h-screen flex-col [overflow-x:clip] ${showTabs ? "pb-[calc(64px+env(safe-area-inset-bottom))] lg:pb-0" : ""}`}>
      <ScrollManager />
      <header className="sticky top-0 z-40 bg-white/95 shadow-[0_10px_30px_-18px_rgba(10,31,74,0.45)] backdrop-blur">
        <nav className="page flex h-16 items-center justify-between gap-4" aria-label="Main">
          <Logo size="md" tagline={BRAND.shortTagline} />

          <div className="hidden items-center gap-1 lg:flex">
            {nav.map((item) => (
              <NavLink key={item.label} to={item.to} className={() => linkCls(isActive(item))}>
                {item.label}
              </NavLink>
            ))}
          </div>

          <HeaderSearch />

          <div className="hidden items-center gap-2 lg:flex">
            {session ? (
              <div className="relative" ref={profileRef}>
                <button
                  onClick={() => setProfileOpen((v) => !v)}
                  aria-expanded={profileOpen}
                  aria-haspopup="menu"
                  className="flex min-h-[44px] items-center gap-2 rounded-xl border border-line bg-white py-1 pl-1 pr-3 text-sm font-medium hover:border-brand-300"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-700 font-display text-sm font-bold text-white">
                    {displayName[0]?.toUpperCase()}
                  </span>
                  <span className="max-w-[9rem] truncate">{displayName}</span>
                  <IconChevronDown width={16} height={16} className={`transition-transform ${profileOpen ? "rotate-180" : ""}`} />
                </button>
                {profileOpen && (
                  <div role="menu" className="absolute right-0 mt-2 w-56 overflow-hidden rounded-xl border border-line bg-white p-1.5 shadow-lift">
                    <div className="px-3 py-2">
                      <div className="truncate text-sm font-semibold">{profile?.full_name || displayName}</div>
                      <div className="truncate text-xs text-ink/50">{user?.email}</div>
                    </div>
                    <div className="my-1 h-px bg-line" />
                    <Link role="menuitem" to="/profile" className="block rounded-lg px-3 py-2 text-sm hover:bg-brand-50">Profile & payments</Link>
                    <Link role="menuitem" to="/dashboard" className="block rounded-lg px-3 py-2 text-sm hover:bg-brand-50">Dashboard</Link>
                    {profile?.role === "admin" && (
                      <Link role="menuitem" to="/admin" className="block rounded-lg px-3 py-2 text-sm hover:bg-brand-50">Admin panel</Link>
                    )}
                    <div className="my-1 h-px bg-line" />
                    <button role="menuitem" onClick={handleSignOut} className="block w-full rounded-lg px-3 py-2 text-left text-sm text-red-700 hover:bg-red-50">
                      Sign out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <>
                <Link to="/login" className="btn-ghost">Log in</Link>
                <Link to="/register" className="btn-primary">Create account</Link>
              </>
            )}
          </div>

          <button
            className="-mr-2 flex h-11 w-11 items-center justify-center rounded-xl text-ink hover:bg-brand-50 lg:hidden"
            onClick={() => setMenuOpen(true)}
            aria-label="Open menu"
            aria-expanded={menuOpen}
          >
            <IconMenu width={24} height={24} />
          </button>
        </nav>
      </header>

      {/* Mobile menu */}
      <div className={`fixed inset-0 z-50 lg:hidden ${menuOpen ? "visible" : "pointer-events-none invisible [transition:visibility_0s_linear_200ms]"}`} aria-hidden={!menuOpen}>
        <div
          className={`absolute inset-0 bg-ink/40 transition-opacity duration-200 ${menuOpen ? "opacity-100" : "opacity-0"}`}
          onClick={() => setMenuOpen(false)}
        />
        <div
          role="dialog"
          aria-label="Menu"
          className={`absolute right-0 top-0 flex h-full w-[86%] max-w-sm flex-col bg-white shadow-lift transition-transform duration-200 ${
            menuOpen ? "translate-x-0" : "translate-x-full"
          }`}
        >
          <div className="flex h-16 items-center justify-between border-b border-line px-4">
            <Logo size="sm" />
            <button onClick={() => setMenuOpen(false)} aria-label="Close menu" className="flex h-11 w-11 items-center justify-center rounded-xl hover:bg-brand-50">
              <IconClose width={22} height={22} />
            </button>
          </div>

          {session && (
            <div className="flex items-center gap-3 border-b border-line px-4 py-4">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-700 font-display font-bold text-white">
                {displayName[0]?.toUpperCase()}
              </span>
              <div className="min-w-0">
                <div className="truncate font-semibold">{profile?.full_name || displayName}</div>
                <div className="truncate text-xs text-ink/50">{user?.email}</div>
              </div>
            </div>
          )}

          <div className="flex-1 overflow-y-auto px-3 py-3">
            {nav.map((item) => (
              <Link key={item.label} to={item.to} className={`flex min-h-[48px] items-center ${linkCls(isActive(item))}`}>
                {item.label}
              </Link>
            ))}
            {session && (
              <>
                <Link to="/profile" className={`flex min-h-[48px] items-center ${linkCls(location.pathname === "/profile")}`}>
                  Profile & payments
                </Link>
                {profile?.role === "admin" && (
                  <Link to="/admin" className={`flex min-h-[48px] items-center ${linkCls(location.pathname.startsWith("/admin"))}`}>
                    Admin panel
                  </Link>
                )}
              </>
            )}
            <div className="my-2 h-px bg-line" />
            <Link to="/faq" className={`flex min-h-[48px] items-center ${linkCls(location.pathname === "/faq")}`}>FAQ</Link>
            <Link to="/contact" className={`flex min-h-[48px] items-center ${linkCls(location.pathname === "/contact")}`}>Contact</Link>
          </div>

          <div className="border-t border-line p-4">
            {session ? (
              <button onClick={handleSignOut} className="btn-secondary w-full">Sign out</button>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <Link to="/login" className="btn-secondary">Log in</Link>
                <Link to="/register" className="btn-primary">Create account</Link>
              </div>
            )}
          </div>
        </div>
      </div>

      <main className="flex-1">
        {/* A crash inside a page shows a message here; the navbar keeps working and
            moving to another page clears it. */}
        <ErrorBoundary resetKey={location.pathname}>
          <Outlet />
        </ErrorBoundary>
      </main>

      <Footer loggedIn={!!session} />
      {showTabs && <MobileTabBar loggedIn={!!session} />}
    </div>
  );
}

/** Search box in the desktop header — sends the visitor to the course list with the search applied. */
function HeaderSearch() {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  return (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        const t = q.trim();
        navigate(t ? `/courses?q=${encodeURIComponent(t)}` : "/courses");
        setQ("");
      }}
      className="hidden w-56 items-center gap-2 rounded-xl border border-line bg-paper px-3 focus-within:border-brand-400 focus-within:bg-white xl:flex 2xl:w-72"
    >
      <IconSearch width={16} height={16} className="shrink-0 text-ink/40" />
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search courses"
        aria-label="Search courses"
        className="h-10 min-w-0 flex-1 bg-transparent text-sm text-ink placeholder:text-ink/40 focus:outline-none"
      />
    </form>
  );
}

const IconHome = (p: SVGProps<SVGSVGElement>) => (
  <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...p}>
    <path d="M3 11.5 12 4l9 7.5" />
    <path d="M5.5 10v9a1 1 0 0 0 1 1H10v-5h4v5h3.5a1 1 0 0 0 1-1v-9" />
  </svg>
);

/** Bottom tab bar for phones: Home · Courses · My Courses · Profile. */
function MobileTabBar({ loggedIn }: { loggedIn: boolean }) {
  const tabs = [
    { to: "/", label: "Home", end: true, icon: IconHome },
    { to: "/courses", label: "Courses", end: true, icon: IconLayers },
    { to: loggedIn ? "/dashboard" : "/login", label: loggedIn ? "My Courses" : "Log in", end: true, icon: IconPlay },
    { to: loggedIn ? "/profile" : "/register", label: loggedIn ? "Profile" : "Sign up", end: true, icon: IconUser },
  ];
  return (
    <nav
      aria-label="Quick navigation"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-10px_30px_-18px_rgba(10,31,74,0.45)] backdrop-blur lg:hidden"
    >
      <ul className="mx-auto grid max-w-md grid-cols-4">
        {tabs.map(({ to, label, end, icon: Icon }) => (
          <li key={label}>
            <NavLink to={to} end={end} className="flex min-h-[60px] flex-col items-center justify-center gap-0.5 text-[11px] font-semibold">
              {({ isActive }) => (
                <>
                  <span className={`flex h-8 w-14 items-center justify-center rounded-full transition-colors ${isActive ? "bg-brand-100 text-brand-700" : "text-ink/50"}`}>
                    <Icon width={22} height={22} />
                  </span>
                  <span className={isActive ? "text-brand-700" : "text-ink/55"}>{label}</span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function Footer({ loggedIn }: { loggedIn: boolean }) {
  const col = "space-y-2.5 text-sm text-white/70";
  const a = "hover:text-white";
  return (
    <footer className="bg-brand-900 text-white">
      <div className="page grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <Logo tone="dark" size="md" />
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-white/70">{BRAND.tagline}</p>
          <a href={`mailto:${BRAND.supportEmail}`} className="mt-4 inline-block text-sm font-medium text-marigold-300 hover:text-marigold-100">
            {BRAND.supportEmail}
          </a>
        </div>
        <div>
          <div className="mb-3 text-sm font-semibold">Learn</div>
          <ul className={col}>
            <li><Link to="/courses" className={a}>All courses</Link></li>
            <li><Link to="/dashboard#my-courses" className={a}>My courses</Link></li>
            {loggedIn ? (
              <li><Link to="/dashboard" className={a}>Dashboard</Link></li>
            ) : (
              <li><Link to="/register" className={a}>Create account</Link></li>
            )}
          </ul>
        </div>
        <div>
          <div className="mb-3 text-sm font-semibold">Company</div>
          <ul className={col}>
            <li><Link to="/about" className={a}>About</Link></li>
            <li><Link to="/contact" className={a}>Contact</Link></li>
            <li><Link to="/faq" className={a}>FAQ</Link></li>
          </ul>
        </div>
        <div>
          <div className="mb-3 text-sm font-semibold">Legal</div>
          <ul className={col}>
            <li><Link to="/privacy-policy" className={a}>Privacy policy</Link></li>
            <li><Link to="/terms" className={a}>Terms</Link></li>
            <li><Link to="/refund-policy" className={a}>Refund policy</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="page flex flex-col gap-2 py-5 text-xs text-white/50 sm:flex-row sm:items-center sm:justify-between">
          <span>© {new Date().getFullYear()} {BRAND.name}. All rights reserved.</span>
          <span>Payments secured by Razorpay</span>
        </div>
      </div>
    </footer>
  );
}
