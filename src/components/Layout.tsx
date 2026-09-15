import { Link, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

export function Layout() {
  const { session, profile, signOut } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b border-slate-100 bg-white/90 backdrop-blur">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link to="/" className="text-lg font-extrabold tracking-tight text-brand-700">
            BS <span className="text-slate-900">Creation</span>
          </Link>
          <div className="hidden items-center gap-6 text-sm font-medium text-slate-600 md:flex">
            <Link to="/courses" className="hover:text-brand-600">Courses</Link>
            <Link to="/about" className="hover:text-brand-600">About</Link>
            <Link to="/faq" className="hover:text-brand-600">FAQ</Link>
            <Link to="/contact" className="hover:text-brand-600">Contact</Link>
          </div>
          <div className="flex items-center gap-3">
            {session ? (
              <>
                <Link
                  to="/dashboard"
                  className="rounded-full px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
                >
                  Dashboard
                </Link>
                {profile?.role === "admin" && (
                  <Link
                    to="/admin"
                    className="rounded-full px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
                  >
                    Admin
                  </Link>
                )}
                <button
                  onClick={async () => {
                    await signOut();
                    navigate("/");
                  }}
                  className="rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
                >
                  Sign out
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="rounded-full px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100">
                  Log in
                </Link>
                <Link to="/register" className="rounded-full bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700">
                  Get Started
                </Link>
              </>
            )}
          </div>
        </nav>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t border-slate-100 bg-slate-50">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 md:grid-cols-4">
          <div>
            <div className="text-lg font-extrabold text-brand-700">BS Creation</div>
            <p className="mt-2 text-sm text-slate-500">Learn. Create. Grow.</p>
          </div>
          <div>
            <div className="mb-3 text-sm font-semibold text-slate-900">Company</div>
            <ul className="space-y-2 text-sm text-slate-500">
              <li><Link to="/about" className="hover:text-brand-600">About</Link></li>
              <li><Link to="/contact" className="hover:text-brand-600">Contact</Link></li>
            </ul>
          </div>
          <div>
            <div className="mb-3 text-sm font-semibold text-slate-900">Legal</div>
            <ul className="space-y-2 text-sm text-slate-500">
              <li><Link to="/privacy-policy" className="hover:text-brand-600">Privacy Policy</Link></li>
              <li><Link to="/terms" className="hover:text-brand-600">Terms</Link></li>
              <li><Link to="/refund-policy" className="hover:text-brand-600">Refund Policy</Link></li>
            </ul>
          </div>
          <div>
            <div className="mb-3 text-sm font-semibold text-slate-900">Support</div>
            <ul className="space-y-2 text-sm text-slate-500">
              <li><Link to="/faq" className="hover:text-brand-600">FAQ</Link></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-slate-100 py-4 text-center text-xs text-slate-400">
          © {new Date().getFullYear()} BS Creation. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
