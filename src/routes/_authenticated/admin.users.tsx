import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { logAdminAction, type AdminUserRow } from "@/lib/admin";
import { DEALER_TIER_LABEL, normalizeTier, type DealerTier } from "@/lib/dealer";
import {
  AdminEmpty,
  AdminSelect,
  AdminSkeleton,
  AdminToolbar,
  Pager,
  usePaging,
} from "@/components/admin/AdminTable";

export const Route = createFileRoute("/_authenticated/admin/users")({
  head: () => ({
    meta: [
      { title: "User & Dealer Management · Admin" },
      { name: "description", content: "Manage marketplace members, dealer tiers and administrator roles." },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "User & Dealer Management · Admin" },
      { property: "og:description", content: "Manage members, dealer tiers and roles." },
    ],
  }),
  component: AdminUsers,
});

const TIERS: DealerTier[] = ["none", "verified", "gold", "premium"];

function AdminUsers() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [tier, setTier] = useState("all");
  const [busy, setBusy] = useState<string | null>(null);

  const { data: users = [], isPending } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async (): Promise<AdminUserRow[]> => {
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, username, country, city, verified, dealer_tier, pi_username, join_date")
        .order("join_date", { ascending: false })
        .limit(500);
      return (data ?? []) as AdminUserRow[];
    },
  });

  const { data: admins = [] } = useQuery({
    queryKey: ["admin-roles"],
    queryFn: async (): Promise<string[]> => {
      const { data } = await supabase.from("user_roles").select("user_id").eq("role", "admin");
      return (data ?? []).map((r) => r.user_id as string);
    },
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter((u) => {
      if (tier !== "all" && normalizeTier(u.dealer_tier) !== tier) return false;
      if (!q) return true;
      return [u.full_name, u.username, u.country, u.city, u.pi_username]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q));
    });
  }, [users, search, tier]);

  const { slice, page, pages, setPage, total } = usePaging(filtered);

  async function setTierFor(u: AdminUserRow, next: DealerTier) {
    if (!user) return;
    setBusy(u.id);
    await supabase.from("profiles").update({ dealer_tier: next }).eq("id", u.id);
    await logAdminAction({ actorId: user.id, action: "dealer_tier_changed", entityType: "profile", entityId: u.id, meta: { to: next } });
    qc.invalidateQueries({ queryKey: ["admin-users"] });
    setBusy(null);
  }

  async function toggleAdmin(u: AdminUserRow, makeAdmin: boolean) {
    if (!user) return;
    setBusy(u.id);
    if (makeAdmin) await supabase.from("user_roles").insert({ user_id: u.id, role: "admin" });
    else await supabase.from("user_roles").delete().eq("user_id", u.id).eq("role", "admin");
    await logAdminAction({
      actorId: user.id,
      action: makeAdmin ? "admin_role_granted" : "admin_role_revoked",
      entityType: "profile",
      entityId: u.id,
    });
    qc.invalidateQueries({ queryKey: ["admin-roles"] });
    setBusy(null);
  }

  return (
    <div>
      <h1 className="mb-2 font-display text-3xl text-gradient-gold sm:text-4xl">Users &amp; Dealers</h1>
      <p className="mb-5 text-sm text-muted-foreground">{total} member{total === 1 ? "" : "s"} matching your filters.</p>

      <AdminToolbar search={search} onSearch={setSearch} placeholder="Search name, username, city, Pi username…">
        <AdminSelect
          label="Tier"
          value={tier}
          onChange={setTier}
          options={[{ value: "all", label: "All tiers" }, ...TIERS.map((t) => ({ value: t, label: DEALER_TIER_LABEL[t] }))]}
        />
      </AdminToolbar>

      {isPending ? (
        <AdminSkeleton />
      ) : slice.length === 0 ? (
        <AdminEmpty title="No members found" body="Adjust the search term or tier filter to widen the results." />
      ) : (
        <ul className="space-y-3">
          {slice.map((u) => {
            const isAdmin = admins.includes(u.id);
            return (
              <li key={u.id} className="glass flex flex-wrap items-center gap-3 rounded-2xl border border-white/10 p-4">
                <div className="min-w-[180px] flex-1">
                  <p className="text-sm font-medium text-white">{u.full_name || u.username || "Unnamed member"}</p>
                  <p className="text-[10px] text-silver/50">
                    @{u.username || u.id.slice(0, 8)} · {[u.city, u.country].filter(Boolean).join(", ") || "Location not set"} ·
                    joined {new Date(u.join_date).toLocaleDateString()}
                  </p>
                  {u.pi_username && <p className="text-[10px] text-gold/80">Pi: @{u.pi_username}</p>}
                </div>
                {isAdmin && (
                  <span className="rounded-full border border-gold/40 bg-gold/15 px-2.5 py-1 text-[10px] uppercase tracking-widest text-gold">
                    Admin
                  </span>
                )}
                <AdminSelect
                  label="Dealer"
                  value={normalizeTier(u.dealer_tier)}
                  onChange={(v) => setTierFor(u, v as DealerTier)}
                  options={TIERS.map((t) => ({ value: t, label: DEALER_TIER_LABEL[t] }))}
                />
                <button
                  disabled={busy === u.id || u.id === user?.id}
                  onClick={() => toggleAdmin(u, !isAdmin)}
                  className="rounded-full border border-white/10 px-3 py-1.5 text-xs text-silver/80 transition hover:border-gold/30 hover:text-white disabled:opacity-40"
                >
                  {isAdmin ? "Revoke admin" : "Make admin"}
                </button>
              </li>
            );
          })}
        </ul>
      )}
      <Pager page={page} pages={pages} onPage={setPage} />
    </div>
  );
}
