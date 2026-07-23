import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AccountLayout } from "@/components/AccountLayout";
import type { Profile } from "@/lib/auth";
import { LANGS } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "My Profile · Pi Global Marketplace" },
      { name: "description", content: "Manage your Pi Global Marketplace profile: photo, contact details, biography and verification status." },
      { property: "og:title", content: "My Profile · Pi Global Marketplace" },
      { property: "og:description", content: "Manage your Pi Global Marketplace profile." },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const qc = useQueryClient();
  const [form, setForm] = useState<Partial<Profile>>({});
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const { data: profile } = useQuery({
    queryKey: ["me-profile"],
    queryFn: async (): Promise<Profile | null> => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return null;
      const { data } = await supabase.from("profiles").select("*").eq("id", u.user.id).maybeSingle();
      return data as Profile | null;
    },
  });

  useEffect(() => { if (profile) setForm(profile); }, [profile]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!profile?.avatar_url) { setAvatarUrl(null); return; }
      const { data } = await supabase.storage.from("avatars").createSignedUrl(profile.avatar_url, 3600);
      if (!cancelled) setAvatarUrl(data?.signedUrl ?? null);
    })();
    return () => { cancelled = true; };
  }, [profile?.avatar_url]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setErr(null); setMsg(null); setBusy(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Not signed in");
      const patch = {
        full_name: form.full_name ?? null,
        username: form.username ?? null,
        phone: form.phone ?? null,
        country: form.country ?? null,
        city: form.city ?? null,
        language: form.language ?? null,
        currency: form.currency ?? null,
        biography: form.biography ?? null,
      };
      const { error } = await supabase.from("profiles").update(patch).eq("id", u.user.id);
      if (error) throw error;
      await qc.invalidateQueries({ queryKey: ["me-profile"] });
      setMsg("Profile saved");
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Failed to save");
    } finally { setBusy(false); }
  }

  async function uploadAvatar(file: File) {
    setErr(null); setMsg(null); setBusy(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Not signed in");
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${u.user.id}/avatar-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { error } = await supabase.from("profiles").update({ avatar_url: path }).eq("id", u.user.id);
      if (error) throw error;
      await qc.invalidateQueries({ queryKey: ["me-profile"] });
      setMsg("Photo updated");
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Upload failed");
    } finally { setBusy(false); }
  }

  return (
    <AccountLayout title="My Profile">
      <form onSubmit={save} className="glass rounded-2xl border border-white/10 p-6 space-y-5">
        <div className="flex items-center gap-4">
          <div className="h-20 w-20 rounded-full overflow-hidden border border-gold/30 bg-white/5 grid place-items-center">
            {avatarUrl ? <img src={avatarUrl} alt="Avatar" className="h-full w-full object-cover" /> : <span className="text-2xl">👤</span>}
          </div>
          <div>
            <label className="btn-ghost-silver inline-flex cursor-pointer rounded-full px-4 py-2 text-xs">
              Change photo
              <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadAvatar(f); }} />
            </label>
            <p className="mt-1 text-[11px] text-silver/60">JPG or PNG, max ~2MB.</p>
          </div>
          <div className="ml-auto text-right">
            <span className={`inline-block rounded-full px-3 py-1 text-[10px] uppercase tracking-widest ${profile?.verified ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30" : "bg-white/5 text-silver/60 border border-white/10"}`}>
              {profile?.verified ? "Verified" : "Unverified"}
            </span>
            <p className="mt-1 text-[11px] text-silver/50">
              Joined {profile?.join_date ? new Date(profile.join_date).toLocaleDateString() : "—"}
            </p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <F label="Full name" value={form.full_name ?? ""} onChange={(v) => setForm({ ...form, full_name: v })} />
          <F label="Username" value={form.username ?? ""} onChange={(v) => setForm({ ...form, username: v })} />
          <F label="Email" value={profile?.email ?? ""} onChange={() => {}} disabled />
          <F label="Phone" value={form.phone ?? ""} onChange={(v) => setForm({ ...form, phone: v })} />
          <F label="Country" value={form.country ?? ""} onChange={(v) => setForm({ ...form, country: v })} />
          <F label="City" value={form.city ?? ""} onChange={(v) => setForm({ ...form, city: v })} />
          <label className="block">
            <span className="text-xs text-silver/80">Preferred language</span>
            <select
              value={form.language ?? "en"} onChange={(e) => setForm({ ...form, language: e.target.value })}
              className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-gold/40"
            >
              {LANGS.map((l) => <option key={l.code} value={l.code} className="bg-onyx">{l.flag} {l.label}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="text-xs text-silver/80">Preferred currency</span>
            <select
              value={form.currency ?? "USD"} onChange={(e) => setForm({ ...form, currency: e.target.value })}
              className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-gold/40"
            >
              {["USD", "EUR", "TRY", "GBP", "JPY", "CNY"].map((c) => <option key={c} value={c} className="bg-onyx">{c}</option>)}
            </select>
          </label>
        </div>

        <label className="block">
          <span className="text-xs text-silver/80">Biography</span>
          <textarea
            value={form.biography ?? ""} onChange={(e) => setForm({ ...form, biography: e.target.value })} rows={4} maxLength={1000}
            className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-gold/40"
            placeholder="Tell buyers who you are…"
          />
        </label>

        {err && <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">{err}</div>}
        {msg && <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300">{msg}</div>}

        <button disabled={busy} className="btn-gold rounded-full px-5 py-2.5 text-sm font-semibold disabled:opacity-60">
          {busy ? "Saving…" : "Save changes"}
        </button>
      </form>
    </AccountLayout>
  );
}

function F({ label, value, onChange, disabled }: { label: string; value: string; onChange: (v: string) => void; disabled?: boolean }) {
  return (
    <label className="block">
      <span className="text-xs text-silver/80">{label}</span>
      <input
        type="text" value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled}
        className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-gold/40 disabled:opacity-60"
      />
    </label>
  );
}
