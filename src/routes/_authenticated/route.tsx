import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    // Session lives in browser storage only, so the gate runs client-side.
    // Redirecting during SSR would emit markup the client then replaces,
    // which React reports as a hydration mismatch.
    if (typeof window === "undefined") return;
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth", replace: true });
    return { user: data.user };
  },

  component: () => <Outlet />,
});
