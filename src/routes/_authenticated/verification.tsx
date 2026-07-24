import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AccountLayout } from "@/components/AccountLayout";

export const Route = createFileRoute("/_authenticated/verification")({
  head: () => ({
    meta: [
      { title: "Seller Verification · Pi Global Marketplace" },
      { name: "description", content: "Get the verified seller badge on Pi Global Marketplace and build buyer trust." },
      { property: "og:title", content: "Seller Verification · Pi Global Marketplace" },
      { property: "og:description", content: "Earn the trusted-seller badge." },
    ],
  }),
  component: VerificationPage,
});

type Req = { id: string; full_legal_name: string; document_type: string; document_url: string | null; notes: string | null; status: "pending" | "approved" | "rejected"; created_at: string };

function VerificationPage() {
  const qc = useQueryClient();
  const [form, setForm] = useState({ full_legal_name: "", document_type: "passport", notes: "" });
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const { data } = useQuery({
    queryKey: ["verification"],
    queryFn: async (): Promise<{ latest: Req | null; verified: boolean }> => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return { latest: null, verified: false };
      const [{ data: reqs }, { data: prof }] = await Promise.all([
        supabase.from("verification_requests").select("*").eq("user_id", u.user.id).order("created_at", { ascending: false }).limit(1),
        supabase.from("profiles").select("verified").eq("id", u.user.id).maybeSingle(),
      ]);
      return { latest: (reqs?.[0] as Req) ?? null, verified: !!prof?.verified };
    },
  });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null); setMsg(null); setBusy(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Not signed in");
      if (!form.full_legal_name.trim()) throw new Error("Full legal name is required");
      let documentUrl: string | null = null;
      if (file) {
        const ext = file.name.split(".").pop() || "jpg";
        const path = `${u.user.id}/verification-${Date.now()}.${ext}`;
        const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
        if (error) throw error;
        documentUrl = path;
      }
      const { error } = await supabase.from("verification_requests").insert({
        user_id: u.user.id,
        full_legal_name: form.full_legal_name.trim(),
        document_type: form.document_type,
        document_url: documentUrl,
        notes: form.notes.trim() || null,
        status: "pending",
      });
      if (error) throw error;
      setMsg("Verification request submitted. We'll review it shortly.");
      setForm({ full_legal_name: "", document_type: "passport", notes: "" });
      setFile(null);
      qc.invalidateQueries({ queryKey: ["verification"] });
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Failed to submit");
    } finally { setBusy(false); }
  }

  const latest = data?.latest;
  const verified = data?.verified;

  return (
    <AccountLayout title="Seller Verification">
      <div className="glass rounded-2xl border border-white/10 p-6 mb-6">
        <div className="flex items-center gap-3">
          <span className={`h-10 w-10 grid place-items-center rounded-full text-lg ${verified ? "bg-emerald-500/20 text-emerald-300" : "bg-white/5 text-silver/60"}`}>✓</span>
          <div>
            <p className="text-sm font-medium">{verified ? "Verified seller" : latest ? `Latest request: ${latest.status}` : "Not verified"}</p>
            <p className="text-xs text-silver/60">
              {verified
                ? "Your listings display the trusted-seller badge."
                : "Get the gold verified badge on all your listings — buyers trust it and convert faster."}
            </p>
          </div>
        </div>
      </div>

      {!verified && (!latest || latest.status !== "pending") && (
        <form onSubmit={submit} className="glass rounded-2xl border border-white/10 p-6 space-y-4">
          <h2 className="font-display text-xl text-gradient-gold">Submit for verification</h2>
          <label className="block">
            <span className="text-xs text-silver/80">Full legal name</span>
            <input value={form.full_legal_name} onChange={(e) => setForm({ ...form, full_legal_name: e.target.value })} className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-gold/40" />
          </label>
          <label className="block">
            <span className="text-xs text-silver/80">Document type</span>
            <select value={form.document_type} onChange={(e) => setForm({ ...form, document_type: e.target.value })} className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-gold/40">
              <option value="passport" className="bg-onyx">Passport</option>
              <option value="national_id" className="bg-onyx">National ID</option>
              <option value="drivers_license" className="bg-onyx">Driver's license</option>
              <option value="business" className="bg-onyx">Business registration</option>
            </select>
          </label>
          <label className="block">
            <span className="text-xs text-silver/80">Document upload (optional)</span>
            <input type="file" accept="image/*,application/pdf" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="mt-1 block w-full text-sm text-silver file:mr-3 file:rounded-full file:border-0 file:bg-gold/20 file:px-4 file:py-1.5 file:text-xs file:text-white" />
          </label>
          <label className="block">
            <span className="text-xs text-silver/80">Notes (optional)</span>
            <textarea rows={3} maxLength={1000} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-gold/40" />
          </label>
          {err && <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">{err}</div>}
          {msg && <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300">{msg}</div>}
          <button disabled={busy} className="btn-gold rounded-full px-6 py-2 text-sm disabled:opacity-60">
            {busy ? "Submitting…" : "Submit for review"}
          </button>
        </form>
      )}

      {latest && (
        <div className="mt-6 glass rounded-2xl border border-white/10 p-6">
          <p className="text-xs uppercase tracking-widest text-silver/60">Latest request</p>
          <div className="mt-2 grid gap-2 sm:grid-cols-2 text-sm">
            <div><span className="text-silver/60">Name:</span> {latest.full_legal_name}</div>
            <div><span className="text-silver/60">Document:</span> {latest.document_type}</div>
            <div><span className="text-silver/60">Status:</span> <span className="uppercase text-gold">{latest.status}</span></div>
            <div><span className="text-silver/60">Submitted:</span> {new Date(latest.created_at).toLocaleString()}</div>
          </div>
        </div>
      )}
    </AccountLayout>
  );
}
