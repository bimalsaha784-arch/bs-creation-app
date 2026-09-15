import { Navigate, useLocation } from "react-router-dom";
import { ReactNode } from "react";
import { useAuth } from "../hooks/useAuth";

/**
 * Client-side route guards are a UX convenience ONLY — they stop the app from
 * rendering a page it shouldn't, but the real security boundary is server-side:
 * Supabase RLS on every table, and the get-signed-url / verify-payment Netlify
 * Functions re-checking auth + enrollment on every request. Never rely on these
 * components alone to protect data or paid content.
 */

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth();
  const location = useLocation();

  if (loading) return <FullPageSpinner />;
  if (!session) return <Navigate to="/login" state={{ from: location }} replace />;
  return <>{children}</>;
}

export function AdminRoute({ children }: { children: ReactNode }) {
  const { session, profile, loading } = useAuth();
  const location = useLocation();

  if (loading) return <FullPageSpinner />;
  if (!session) return <Navigate to="/login" state={{ from: location }} replace />;
  if (profile && profile.role !== "admin") return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

function FullPageSpinner() {
  return (
    <div className="flex h-[60vh] items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
    </div>
  );
}
