import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { logAdminAction, type AdminListingRow } from "@/lib/admin";
import {
  AdminEmpty,
  AdminSelect,
  AdminSkeleton,
  AdminToolbar,
  Pager,
  usePaging,
} from "@/components/admin/AdminTable";

export const Route = createFileRoute("/_authenticated/admin/listings")({
  head: () => ({
    meta: [
      { title: "Listing Moderation · Admin" },
      { name: "description", content: "Approve, reject and audit marketplace listings across every category." },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "Listing Moderation · Admin" },
      { property: "og:description", content: "Approve, reject and audit marketplace listings." },
    ],
  }),
  component: AdminListings,
});

function AdminListings() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [mod, setMod] = useState("all");
  const [status, setStatus] = useState("all");
  const [busy, setBusy] = useState<string | null>(null);

  const { data: rows = [], isPending } = useQuery({
    queryKey: ["admin-listings"],
    queryFn: async (): Promise<AdminListingRow[]> => {
      const { data } = await supabase
        .from("listings")
        .select("id, seller_id, title, category, price_usd, status, moderation_status, moderation_note, created_at")
        .order("created_at", { ascending: false })
        .limit(500);
      return (data ?? []) as AdminListingRow[];
    },
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (mod !== "all" && r.moderation_status !== mod) return false;
      if (status !== "all" && r.status !== status) return false;
      if (!q) return true;
      return [r.title, r.category].some((v) => String(v).toLowerCase().includes(q));
    });
  }, [rows, search, mod, status]);

  const { slice, page, pages, setPage, total } = usePaging(filtered);

  async function moderate(row: AdminListingRow, next: "approved" | "rejected" | "pending") {
    if (!user) return;
    setBusy(row.id);
    const note = next === "rejected" ? window.prompt("Reason shown to the seller (optional):") ?? null : null;
    const patch: Record<string, unknown> = { moderation_status: next, moderation_note: note };
    if (next === "rejected") patch["status"] = "archived";
    await supabase.from("listings").update(patch as never).eq("id", row.id);
    await supabase.from("notifications").insert({
      user_id: row.seller_id,
      type: "moderation",
      title: next === "approved" ? "Listing approved" : next === "rejected" ? "Listing rejected" : "Listing under review",
      body: `"${row.title}" is now ${next}.${note ? ` Reason: ${note}` : ""}`,
      link: "/listings",
    });
    await logAdminAction({ actorId: user.id, action: `listing_${next}`, entityType: "listing", entityId: row.id, meta: { note } });
    qc.invalidateQueries({ queryKey: ["admin-listings"] });
    qc.invalidateQueries({ queryKey: ["admin-counts"] });
    setBusy(null);
  }

  return (
    <div>
      <h1 className="mb-2 font-display text-3xl text-gradient-gold sm:text-4xl">Listings</h1>
      <p className="mb-5 text-sm text-muted-foreground">{total} listing{total === 1 ? "" : "s"} matching your filters.</p>

      <AdminToolbar search={search} onSearch={setSearch} placeholder="Search listing title or category…">
        <AdminSelect
          label="Moderation"
          value={mod}
          onChange={setMod}
          options={[
            { value: "all", label: "All" },
            { value: "pending", label: "Pending" },
            { value: "approved", label: "Approved" },
            { value: "rejected", label: "Rejected" },
          ]}
        />
        <AdminSelect
          label="Status"
          value={status}
          onChange={setStatus}
          options={["all", "draft", "active", "reserved", "sold", "archived"].map((s) => ({
            value: s,
            label: s === "all" ? "All statuses" : s[0]!.toUpperCase() + s.slice(1),
          }))}
        />
      </AdminToolbar>

      {isPending ? (
        <AdminSkeleton />
      ) : slice.length === 0 ? (
        <AdminEmpty title="No listings found" body="Try a different search term, moderation state or listing status." />
      ) : (
        <ul className="space-y-3">
          {slice.map((r) => (
            <li key={r.id} className="glass flex flex-wrap items-center gap-3 rounded-2xl border border-white/10 p-4">
              <div className="min-w-[200px] flex-1">
                <Link to="/listing/$id" params={{ id: r.id }} className="text-sm font-medium text-white hover:text-gold">
                  {r.title}
                </Link>
                <p className="text-[10px] text-silver/50">
                  {r.category} · ${Number(r.price_usd).toLocaleString()} · {new Date(r.created_at).toLocaleDateString()}
                </p>
                {r.moderation_note && <p className="text-[10px] text-amber-200/80">Note: {r.moderation_note}</p>}
              </div>
              <span className="rounded-full border border-white/10 px-2.5 py-1 text-[10px] uppercase tracking-widest text-silver/70">
                {r.status}
              </span>
              <span
                className={`rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-widest ${
                  r.moderation_status === "approved"
                    ? "border-emerald-500/30 bg-emerald-500/15 text-emerald-300"
                    : r.moderation_status === "rejected"
                      ? "border-red-500/30 bg-red-500/15 text-red-300"
                      : "border-amber-500/30 bg-amber-500/15 text-amber-300"
                }`}
              >
                {r.moderation_status}
              </span>
              <div className="flex gap-2">
                {r.moderation_status !== "approved" && (
                  <button
                    disabled={busy === r.id}
                    onClick={() => moderate(r, "approved")}
                    className="btn-gold rounded-full px-3 py-1.5 text-xs disabled:opacity-50"
                  >
                    Approve
                  </button>
                )}
                {r.moderation_status !== "rejected" && (
                  <button
                    disabled={busy === r.id}
                    onClick={() => moderate(r, "rejected")}
                    className="rounded-full border border-red-500/25 px-3 py-1.5 text-xs text-red-200 transition hover:border-red-500/50 disabled:opacity-50"
                  >
                    Reject
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
      <Pager page={page} pages={pages} onPage={setPage} />
    </div>
  );
}
