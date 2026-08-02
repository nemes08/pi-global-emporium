import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { logAdminAction, type ReportRow } from "@/lib/admin";
import { AdminEmpty, AdminSkeleton } from "@/components/admin/AdminTable";

export const Route = createFileRoute("/_authenticated/admin/moderation")({
  head: () => ({
    meta: [
      { title: "Reviews & Reports · Admin" },
      { name: "description", content: "Moderate seller reviews and handle user reports across the marketplace." },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "Reviews & Reports · Admin" },
      { property: "og:description", content: "Moderate reviews and handle user reports." },
    ],
  }),
  component: AdminModeration,
});

type ReviewRow = { id: string; seller_id: string; buyer_id: string; rating: number; comment: string | null; created_at: string };

function AdminModeration() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [busy, setBusy] = useState<string | null>(null);

  const { data: reviews = [], isPending } = useQuery({
    queryKey: ["admin-reviews"],
    queryFn: async (): Promise<ReviewRow[]> => {
      const { data } = await supabase.from("reviews").select("*").order("created_at", { ascending: false }).limit(200);
      return (data ?? []) as ReviewRow[];
    },
  });

  const { data: reports = [] } = useQuery({
    queryKey: ["admin-reports"],
    queryFn: async (): Promise<ReportRow[]> => {
      const { data } = await supabase.from("reports").select("*").order("created_at", { ascending: false }).limit(200);
      return (data ?? []) as ReportRow[];
    },
  });

  async function removeReview(r: ReviewRow) {
    if (!user) return;
    setBusy(r.id);
    await supabase.from("reviews").delete().eq("id", r.id);
    await logAdminAction({ actorId: user.id, action: "review_removed", entityType: "review", entityId: r.id });
    qc.invalidateQueries({ queryKey: ["admin-reviews"] });
    setBusy(null);
  }

  async function setReport(rep: ReportRow, status: ReportRow["status"]) {
    if (!user) return;
    setBusy(rep.id);
    await supabase
      .from("reports")
      .update({ status, handled_by: user.id, handled_at: new Date().toISOString() })
      .eq("id", rep.id);
    await logAdminAction({ actorId: user.id, action: `report_${status}`, entityType: "report", entityId: rep.id });
    qc.invalidateQueries({ queryKey: ["admin-reports"] });
    qc.invalidateQueries({ queryKey: ["admin-counts"] });
    setBusy(null);
  }

  return (
    <div>
      <h1 className="mb-6 font-display text-3xl text-gradient-gold sm:text-4xl">Reviews &amp; Reports</h1>

      <section aria-labelledby="reports-h" className="mb-10">
        <h2 id="reports-h" className="mb-3 text-[11px] uppercase tracking-widest text-silver/50">Reports ({reports.length})</h2>
        {reports.length === 0 ? (
          <AdminEmpty title="No reports" body="User reports about listings, members or reviews will appear here." />
        ) : (
          <ul className="space-y-3">
            {reports.map((rep) => (
              <li key={rep.id} className="glass flex flex-wrap items-center gap-3 rounded-2xl border border-white/10 p-4">
                <div className="min-w-[200px] flex-1">
                  <p className="text-sm text-white">{rep.reason}</p>
                  <p className="text-[10px] text-silver/50">
                    {rep.target_type} #{rep.target_id.slice(0, 8)} · {new Date(rep.created_at).toLocaleString()}
                  </p>
                  {rep.details && <p className="mt-1 text-xs text-silver/70">{rep.details}</p>}
                </div>
                <span className="rounded-full border border-white/10 px-2.5 py-1 text-[10px] uppercase tracking-widest text-silver/70">
                  {rep.status}
                </span>
                <button disabled={busy === rep.id} onClick={() => setReport(rep, "actioned")} className="btn-gold rounded-full px-3 py-1.5 text-xs disabled:opacity-50">
                  Action
                </button>
                <button disabled={busy === rep.id} onClick={() => setReport(rep, "dismissed")} className="rounded-full border border-white/10 px-3 py-1.5 text-xs text-silver/80 disabled:opacity-50">
                  Dismiss
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="reviews-h">
        <h2 id="reviews-h" className="mb-3 text-[11px] uppercase tracking-widest text-silver/50">Reviews ({reviews.length})</h2>
        {isPending ? (
          <AdminSkeleton rows={4} />
        ) : reviews.length === 0 ? (
          <AdminEmpty title="No reviews yet" body="Buyer reviews of verified transactions will appear here for moderation." />
        ) : (
          <ul className="space-y-3">
            {reviews.map((r) => (
              <li key={r.id} className="glass flex flex-wrap items-center gap-3 rounded-2xl border border-white/10 p-4">
                <div className="min-w-[200px] flex-1">
                  <p className="text-sm text-white" aria-label={`${r.rating} out of 5 stars`}>
                    {"★".repeat(r.rating)}
                    <span className="text-silver/30">{"★".repeat(5 - r.rating)}</span>
                  </p>
                  <p className="text-xs text-silver/70">{r.comment || "No written feedback"}</p>
                  <p className="text-[10px] text-silver/50">{new Date(r.created_at).toLocaleString()}</p>
                </div>
                <button
                  disabled={busy === r.id}
                  onClick={() => removeReview(r)}
                  className="rounded-full border border-red-500/25 px-3 py-1.5 text-xs text-red-200 hover:border-red-500/50 disabled:opacity-50"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
