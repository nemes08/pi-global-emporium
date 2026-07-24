import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AccountLayout } from "@/components/AccountLayout";
import { usePricing } from "@/lib/pricing";

export const Route = createFileRoute("/_authenticated/orders")({
  head: () => ({
    meta: [
      { title: "Orders · Pi Global Marketplace" },
      { name: "description", content: "Track your Pi Global Marketplace purchases and sales in one place." },
      { property: "og:title", content: "Orders · Pi Global Marketplace" },
      { property: "og:description", content: "Track your Pi Global Marketplace purchases and sales." },
    ],
  }),
  component: OrdersPage,
});

type OrderRow = {
  id: string;
  listing_id: string;
  buyer_id: string;
  seller_id: string;
  price_usd: number;
  status: "pending" | "paid" | "shipped" | "completed" | "cancelled" | "refunded";
  pi_tx_id: string | null;
  created_at: string;
  listings: { title: string | null } | null;
};

function OrdersPage() {
  const qc = useQueryClient();
  const [uid, setUid] = useState<string | null>(null);
  const [tab, setTab] = useState<"purchases" | "sales">("purchases");
  const { usdPerPi } = usePricing();
  useEffect(() => { supabase.auth.getUser().then(({ data }) => setUid(data.user?.id ?? null)); }, []);

  const { data, isLoading } = useQuery({
    queryKey: ["orders", uid, tab],
    queryFn: async (): Promise<OrderRow[]> => {
      if (!uid) return [];
      const col = tab === "purchases" ? "buyer_id" : "seller_id";
      const { data } = await supabase.from("orders").select("*, listings(title)").eq(col, uid).order("created_at", { ascending: false });
      return (data ?? []) as OrderRow[];
    },
    enabled: !!uid,
  });

  async function updateStatus(id: string, status: OrderRow["status"]) {
    await supabase.from("orders").update({ status }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["orders", uid, tab] });
  }

  return (
    <AccountLayout title="Orders">
      <div className="flex gap-2 mb-4">
        {(["purchases", "sales"] as const).map((k) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`rounded-full px-4 py-1.5 text-xs font-medium border transition capitalize ${
              tab === k ? "btn-gold text-onyx border-transparent" : "border-white/10 text-silver/80 hover:border-gold/30"
            }`}
          >{k}</button>
        ))}
      </div>

      {isLoading ? (
        <div className="text-sm text-silver/60">Loading…</div>
      ) : !data || data.length === 0 ? (
        <div className="glass rounded-2xl p-10 text-center border border-white/10">
          <div className="text-4xl">⛃</div>
          <p className="text-sm text-silver/70 mt-2">No {tab} yet.</p>
          <Link to="/marketplace" className="mt-3 inline-flex btn-gold rounded-full px-4 py-2 text-xs">Explore marketplace</Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {data.map((o) => (
            <li key={o.id} className="glass rounded-2xl border border-white/10 p-4 flex items-center gap-4 flex-wrap">
              <div className="flex-1 min-w-[200px]">
                <Link to="/listing/$id" params={{ id: o.listing_id }} className="text-sm font-medium hover:text-gold">
                  {o.listings?.title || "Listing"}
                </Link>
                <p className="text-[10px] text-silver/50 mt-0.5">Order #{o.id.slice(0, 8)} · {new Date(o.created_at).toLocaleString()}</p>
                {o.pi_tx_id && <p className="text-[10px] text-silver/50">Pi TX: {o.pi_tx_id}</p>}
              </div>
              <div className="text-right">
                <p className="font-display text-lg text-gradient-gold">{(o.price_usd / usdPerPi).toLocaleString(undefined, { maximumFractionDigits: 5 })} π</p>
                <p className="text-[10px] text-silver/50">${o.price_usd.toLocaleString()}</p>
              </div>
              <StatusBadge status={o.status} />
              {tab === "sales" && o.status !== "completed" && o.status !== "cancelled" && (
                <select value={o.status} onChange={(e) => updateStatus(o.id, e.target.value as OrderRow["status"])} className="rounded-full border border-white/10 bg-black/40 px-3 py-1 text-xs text-silver">
                  {(["pending", "paid", "shipped", "completed", "cancelled", "refunded"] as const).map((s) => <option key={s} value={s} className="bg-onyx">{s}</option>)}
                </select>
              )}
            </li>
          ))}
        </ul>
      )}
    </AccountLayout>
  );
}

function StatusBadge({ status }: { status: OrderRow["status"] }) {
  const tone: Record<string, string> = {
    pending: "bg-white/5 text-silver/70 border-white/10",
    paid: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
    shipped: "bg-sky-500/15 text-sky-300 border-sky-500/30",
    completed: "bg-emerald-500/20 text-emerald-200 border-emerald-500/40",
    cancelled: "bg-red-500/10 text-red-300 border-red-500/20",
    refunded: "bg-amber-500/10 text-amber-200 border-amber-500/20",
  };
  return <span className={`rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-widest ${tone[status]}`}>{status}</span>;
}
