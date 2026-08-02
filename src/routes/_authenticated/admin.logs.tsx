import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { ActivityLogRow } from "@/lib/admin";
import { AdminEmpty, AdminSkeleton, Pager, usePaging } from "@/components/admin/AdminTable";

export const Route = createFileRoute("/_authenticated/admin/logs")({
  head: () => ({
    meta: [
      { title: "Activity Logs · Admin" },
      { name: "description", content: "Audit trail of every administrator action taken on the platform." },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "Activity Logs · Admin" },
      { property: "og:description", content: "Audit trail of administrator actions." },
    ],
  }),
  component: AdminLogs,
});

function AdminLogs() {
  const { data: rows = [], isPending } = useQuery({
    queryKey: ["admin-logs"],
    queryFn: async (): Promise<ActivityLogRow[]> => {
      const { data } = await supabase.from("activity_logs").select("*").order("created_at", { ascending: false }).limit(500);
      return (data ?? []) as ActivityLogRow[];
    },
  });
  const { slice, page, pages, setPage } = usePaging(rows, 20);

  return (
    <div>
      <h1 className="mb-6 font-display text-3xl text-gradient-gold sm:text-4xl">Activity Logs</h1>
      {isPending ? (
        <AdminSkeleton rows={6} />
      ) : slice.length === 0 ? (
        <AdminEmpty title="No admin activity recorded" body="Every moderation, escrow and role action is logged here for audit." />
      ) : (
        <ul className="glass divide-y divide-white/5 rounded-2xl border border-white/10">
          {slice.map((l) => (
            <li key={l.id} className="flex flex-wrap items-center gap-3 p-3 text-xs">
              <span className="rounded-full border border-gold/25 bg-gold/10 px-2 py-0.5 text-[10px] uppercase tracking-widest text-gold">
                {l.action.replace(/_/g, " ")}
              </span>
              <span className="text-silver/70">
                {l.entity_type ?? "—"} {l.entity_id ? `#${l.entity_id.slice(0, 8)}` : ""}
              </span>
              <span className="ml-auto text-silver/50">{new Date(l.created_at).toLocaleString()}</span>
            </li>
          ))}
        </ul>
      )}
      <Pager page={page} pages={pages} onPage={setPage} />
    </div>
  );
}
