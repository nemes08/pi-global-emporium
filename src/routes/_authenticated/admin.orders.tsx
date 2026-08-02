import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { logAdminAction } from "@/lib/admin";
import { ESCROW_LABEL, ESCROW_TONE, type EscrowStatus, type DisputeRow } from "@/lib/escrow";
import { AdminEmpty, AdminSelect, AdminSkeleton, AdminToolbar, Pager, usePaging } from "@/components/admin/AdminTable";

export const Route = createFileRoute("/_authenticated/admin/orders")({
  head: () => ({
    meta: [
      { title: "Orders & Escrow · Admin" },
      { name: "description", content: "Oversee every marketplace order, escrow state and open dispute." },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "Orders & Escrow · Admin" },
      { property: "og:description", content: "Oversee orders, escrow states and disputes." },
    ],
  }),
  component: AdminOrders,
});

type Row = {
  id: string;
  order_id: string;
  buyer_id: string;
  seller_id: string;
  amount_usd: number;
  status: EscrowStatus;
  pi_tx_id: string | null;
  created_at: string;
  orders: { listing_id: string; listings: { title: string | null } | null } | null;
};

const STATES: EscrowStatus[] = [
  "awaiting_payment", "funded", "shipped", "delivered", "released", "refunded", "disputed", "cancelled",
];

function AdminOrders() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [state, setState] = useState("all");
  const [busy, setBusy] = useState<string | null>(null);

  const { data: rows = [], isPending } = useQuery({
    queryKey: ["admin-escrows"],
    queryFn: async (): Promise<Row[]> => {
      const { data } = await supabase
        .from("escrows")
        .select("*, orders(listing_id, listings(title))")
        .order("created_at", { ascending: false })
        .limit(500);
      return (data ?? []) as unknown as Row[];
    },
  });

  const { data: disputes = [] } = useQuery({
    queryKey: ["admin-disputes"],
    queryFn: async (): Promise<DisputeRow[]> => {
      const { data } = await supabase.from("disputes").select("*").order("created_at", { ascending: false });
      return (data ?? []) as DisputeRow[];
    },
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (state !== "all" && r.status !== state) return false;
      if (!q) return true;
      return [r.orders?.listings?.title, r.id, r.pi_tx_id].filter(Boolean).some((v) => String(v).toLowerCase().includes(q));
    });
  }, [rows, search, state]);

  const { slice, page, pages, setPage, total } = usePaging(filtered);

  async function force(row: Row, next: EscrowStatus) {
    if (!user) return;
    setBusy(row.id);
    await supabase.from("escrows").update({ status: next }).eq("id", row.id);
    await logAdminAction({ actorId: user.id, action: "escrow_status_forced", entityType: "escrow", entityId: row.id, meta: { to: next } });
    qc.invalidateQueries({ queryKey: ["admin-escrows"] });
    setBusy(null);
  }

  async function resolve(d: DisputeRow, outcome: "resolved_buyer" | "resolved_seller" | "closed") {
    if (!user) return;
    const resolution = window.prompt("Resolution summary shared with both parties:") ?? null;
    await supabase
      .from("disputes")
      .update({ status: outcome, resolution, resolved_by: user.id, resolved_at: new Date().toISOString() })
      .eq("id", d.id);
    if (d.escrow_id) {
      const next: EscrowStatus = outcome === "resolved_buyer" ? "refunded" : outcome === "resolved_seller" ? "released" : "delivered";
      await supabase.from("escrows").update({ status: next }).eq("id", d.escrow_id);
    }
    await logAdminAction({ actorId: user.id, action: `dispute_${outcome}`, entityType: "dispute", entityId: d.id, meta: { resolution } });
    qc.invalidateQueries({ queryKey: ["admin-disputes"] });
    qc.invalidateQueries({ queryKey: ["admin-escrows"] });
  }

  const openDisputes = disputes.filter((d) => d.status === "open" || d.status === "under_review");

  return (
    <div>
      <h1 className="mb-2 font-display text-3xl text-gradient-gold sm:text-4xl">Orders &amp; Escrow</h1>
      <p className="mb-5 text-sm text-muted-foreground">{total} escrow{total === 1 ? "" : "s"} matching your filters.</p>

      {openDisputes.length > 0 && (
        <section aria-labelledby="disputes" className="mb-8">
          <h2 id="disputes" className="mb-3 text-[11px] uppercase tracking-widest text-red-300/80">
            Open disputes ({openDisputes.length})
          </h2>
          <ul className="space-y-3">
            {openDisputes.map((d) => (
              <li key={d.id} className="glass flex flex-wrap items-center gap-3 rounded-2xl border border-red-500/25 p-4">
                <div className="min-w-[200px] flex-1">
                  <p className="text-sm text-white">{d.reason}</p>
                  <p className="text-[10px] text-silver/50">
                    Order #{d.order_id.slice(0, 8)} · opened {new Date(d.created_at).toLocaleString()}
                  </p>
                  {d.details && <p className="mt-1 text-xs text-silver/70">{d.details}</p>}
                </div>
                <button onClick={() => resolve(d, "resolved_buyer")} className="rounded-full border border-white/10 px-3 py-1.5 text-xs text-silver/80 hover:border-gold/30">
                  Refund buyer
                </button>
                <button onClick={() => resolve(d, "resolved_seller")} className="btn-gold rounded-full px-3 py-1.5 text-xs">
                  Release to seller
                </button>
                <button onClick={() => resolve(d, "closed")} className="rounded-full border border-white/10 px-3 py-1.5 text-xs text-silver/80 hover:border-gold/30">
                  Close
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <AdminToolbar search={search} onSearch={setSearch} placeholder="Search listing title, escrow id or Pi TX…">
        <AdminSelect
          label="State"
          value={state}
          onChange={setState}
          options={[{ value: "all", label: "All states" }, ...STATES.map((s) => ({ value: s, label: ESCROW_LABEL[s] }))]}
        />
      </AdminToolbar>

      {isPending ? (
        <AdminSkeleton />
      ) : slice.length === 0 ? (
        <AdminEmpty title="No escrows found" body="Adjust the search term or escrow state filter." />
      ) : (
        <ul className="space-y-3">
          {slice.map((r) => (
            <li key={r.id} className="glass flex flex-wrap items-center gap-3 rounded-2xl border border-white/10 p-4">
              <div className="min-w-[200px] flex-1">
                <p className="text-sm font-medium text-white">{r.orders?.listings?.title || "Listing"}</p>
                <p className="text-[10px] text-silver/50">
                  Escrow #{r.id.slice(0, 8)} · order #{r.order_id.slice(0, 8)} · {new Date(r.created_at).toLocaleDateString()}
                </p>
                {r.pi_tx_id && <p className="text-[10px] break-all text-silver/50">Pi TX: {r.pi_tx_id}</p>}
              </div>
              <p className="text-sm text-silver">${Number(r.amount_usd).toLocaleString()}</p>
              <span className={`rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-widest ${ESCROW_TONE[r.status]}`}>
                {ESCROW_LABEL[r.status]}
              </span>
              <AdminSelect
                label="Set"
                value={r.status}
                onChange={(v) => force(r, v as EscrowStatus)}
                options={STATES.map((s) => ({ value: s, label: ESCROW_LABEL[s] }))}
              />
              {busy === r.id && <span className="text-[10px] text-silver/50">Saving…</span>}
            </li>
          ))}
        </ul>
      )}
      <Pager page={page} pages={pages} onPage={setPage} />
    </div>
  );
}
