import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  component: AuthGate,
});

/**
 * Client-side auth gate.
 *
 * The Supabase session lives in browser storage, so the server cannot know
 * whether a visitor is signed in. Both server and client therefore render the
 * same neutral skeleton on first paint (no hydration mismatch), and the
 * redirect to /auth happens once the session has resolved in the browser.
 */
function AuthGate() {
  const { session, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !session) navigate({ to: "/auth", replace: true });
  }, [loading, session, navigate]);

  if (loading || !session) {
    return (
      <div className="min-h-dvh px-4 py-16 sm:px-6" aria-busy="true" aria-live="polite">
        <span className="sr-only">Checking your session…</span>
        <div className="mx-auto w-full max-w-7xl space-y-4">
          <div className="glass h-24 animate-pulse rounded-3xl border border-white/10" />
          <div className="glass h-64 animate-pulse rounded-3xl border border-white/10" />
        </div>
      </div>
    );
  }

  return <Outlet />;
}
