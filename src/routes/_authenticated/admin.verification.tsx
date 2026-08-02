import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { logAdminAction } from "@/lib/admin";
import { AdminEmpty, AdminSkeleton } from "@/components/admin/AdminTable";

export const Route = createFileRoute("/_authenticated/admin/verification")({
  head: () => ({
    meta: [
      { title: "Verification Queue · Admin" },
      { name: "description", content: "Review dealer verification requests and grant verified seller status." },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "Verification Queue · Admin" },
      { property: "og:description", content: "Review dealer verification requests." },
    ],
  }),
  component: AdminVerification,
});

type VRow = {
  id: string;
  user_id: string;
  full_legal_name: string;
  document_type: string;
  notes: string | null;
  status: "pending" | "approved" | "rejected";
  created_at: string;
};

function AdminVerification() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [busy, setBusy] = useState<string | null>(null);

  const { data: rows = [], isPending } = useQuery({
    queryKey: ["admin-verifications"],
    queryFn: async (): Promise<VRow[]> => {
      const { data } = await supabase
        .from("verification_requests")
        .select("id, user_id, full_legal_name, document_type, notes, status, created_at")
        .order("created_at", { ascending: false })
        .limit(200);
      return (data ?? []) as VRow[];
    },
  });

  async function decide(row: VRow, status: "approved" | "rejected") {
    if (!user) return;
    setBusy(row.id);
    await supabase.from("verification_requests").update({ status }).eq("id", row.id);
    if (status === "approved") {
      await supabase.from("profiles").update({ verified: true, dealer_tier: "verified" }).eq("id", row.user_id);
    }
    await supabase.from("notifications").insert({
      user_id: row.user_id,
      type: "verification",
      title: status === "approved" ? "Verification approved" : "Verification rejected",
      body:
        status === "approved"
          ? "Your dealer verification was approved — the verified badge is now active on your listings."
          : "Your verification request was not approved. You can submit updated documents at any time.",
      link: "/verification",
    });
    await logAdminAction({ actorId: user.id, action: `verification_${status}`, entityType: "verification_request", entityId: row.id });
    qc.invalidateQueries({ queryKey: ["admin-verifications"] });
    qc.invalidateQueries({ queryKey: ["admin-counts"] });
    setBusy(null);
  }

  return (
    <div>
      <h1 className="mb-6 font-display text-3xl text-gradient-gold sm:text-4xl">Verification Queue</h1>
      {isPending ? (
        <AdminSkeleton rows={4} />
      ) : rows.length === 0 ? (
        <AdminEmpty title="Queue is empty" body="Dealer verification requests submitted by sellers will appear here." />
      ) : (
        <ul className="space-y-3">
          {rows.map((r) => (
            <li key={r.id} className="glass flex flex-wrap items-center gap-3 rounded-2xl border border-white/10 p-4">
              <div className="min-w-[200px] flex-1">
                <p className="text-sm font-medium text-white">{r.full_legal_name}</p>
                <p className="text-[10px] text-silver/50">
                  {r.document_type} · submitted {new Date(r.created_at).toLocaleString()}
                </p>
                {r.notes && <p className="mt-1 text-xs text-silver/70">{r.notes}</p>}
              </div>
              <span className="rounded-full border border-white/10 px-2.5 py-1 text-[10px] uppercase tracking-widest text-silver/70">
                {r.status}
              </span>
              {r.status === "pending" && (
                <div className="flex gap-2">
                  <button disabled={busy === r.id} onClick={() => decide(r, "approved")} className="btn-gold rounded-full px-3 py-1.5 text-xs disabled:opacity-50">
                    Approve
                  </button>
                  <button
                    disabled={busy === r.id}
                    onClick={() => decide(r, "rejected")}
                    className="rounded-full border border-red-500/25 px-3 py-1.5 text-xs text-red-200 hover:border-red-500/50 disabled:opacity-50"
                  >
                    Reject
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
