import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AccountLayout } from "@/components/AccountLayout";

export const Route = createFileRoute("/_authenticated/notifications")({
  head: () => ({
    meta: [
      { title: "Notifications · Pi Global Marketplace" },
      { name: "description", content: "Your Pi Global Marketplace notification center — offers, messages, orders and account activity." },
      { property: "og:title", content: "Notifications · Pi Global Marketplace" },
      { property: "og:description", content: "Real-time updates for offers, orders and messages." },
    ],
  }),
  component: NotificationsPage,
});

type Notif = { id: string; type: string; title: string; body: string | null; link: string | null; read_at: string | null; created_at: string };

function NotificationsPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["notifications"],
    queryFn: async (): Promise<Notif[]> => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return [];
      const { data } = await supabase.from("notifications").select("*").eq("user_id", u.user.id).order("created_at", { ascending: false }).limit(100);
      return (data ?? []) as Notif[];
    },
  });

  async function markAllRead() {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("user_id", u.user.id).is("read_at", null);
    qc.invalidateQueries({ queryKey: ["notifications"] });
  }

  async function markOne(id: string) {
    await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["notifications"] });
  }

  async function remove(id: string) {
    await supabase.from("notifications").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["notifications"] });
  }

  return (
    <AccountLayout title="Notifications">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-silver/60">{data?.length ?? 0} recent</p>
        <button onClick={markAllRead} className="btn-ghost-silver rounded-full px-4 py-1.5 text-xs">Mark all read</button>
      </div>
      {isLoading ? (
        <div className="text-sm text-silver/60">Loading…</div>
      ) : !data || data.length === 0 ? (
        <div className="glass rounded-2xl p-10 text-center border border-white/10">
          <div className="text-4xl">◎</div>
          <p className="text-sm text-silver/70 mt-2">You're all caught up.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {data.map((n) => (
            <li key={n.id} className={`glass rounded-2xl border p-4 flex items-start gap-3 ${n.read_at ? "border-white/10 opacity-70" : "border-gold/20"}`}>
              <span className={`h-8 w-8 grid place-items-center rounded-full text-xs ${n.read_at ? "bg-white/5 text-silver/60" : "bg-gold/20 text-gold"}`}>
                {typeIcon(n.type)}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{n.title}</p>
                {n.body && <p className="text-xs text-silver/70 mt-0.5">{n.body}</p>}
                <p className="text-[10px] text-silver/50 mt-1">{new Date(n.created_at).toLocaleString()}</p>
              </div>
              <div className="flex flex-col gap-1 items-end">
                {n.link && <Link to={n.link} className="text-xs text-gold hover:underline">Open →</Link>}
                {!n.read_at && <button onClick={() => markOne(n.id)} className="text-[10px] text-silver/60 hover:text-white">Mark read</button>}
                <button onClick={() => remove(n.id)} className="text-[10px] text-red-300/70 hover:text-red-300">Delete</button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </AccountLayout>
  );
}

function typeIcon(type: string) {
  switch (type) {
    case "message": return "✉";
    case "offer": return "⇄";
    case "order": return "⛃";
    case "listing": return "▤";
    case "verification": return "✓";
    default: return "◎";
  }
}
