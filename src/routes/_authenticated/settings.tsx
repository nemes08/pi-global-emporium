import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { AccountLayout } from "@/components/AccountLayout";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "Account Settings · Pi Global Marketplace" },
      { name: "description", content: "Change your password, notification preferences, privacy and security settings on Pi Global Marketplace." },
      { property: "og:title", content: "Account Settings · Pi Global Marketplace" },
      { property: "og:description", content: "Manage security, privacy and preferences for your Pi Global account." },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const { user } = useAuth();
  return (
    <AccountLayout title="Account Settings">
      <div className="space-y-6">
        <PasswordCard />
        <PreferencesCard />
        <SecurityCard email={user?.email ?? ""} />
      </div>
    </AccountLayout>
  );
}

function PasswordCard() {
  const [pw, setPw] = useState("");
  const [cf, setCf] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null); setMsg(null);
    try {
      const parsed = z.string().min(8).max(72).parse(pw);
      if (parsed !== cf) throw new Error("Passwords do not match");
      setBusy(true);
      const { error } = await supabase.auth.updateUser({ password: parsed });
      if (error) throw error;
      setPw(""); setCf(""); setMsg("Password updated.");
    } catch (e: unknown) { setErr(e instanceof Error ? e.message : "Failed"); }
    finally { setBusy(false); }
  }

  return (
    <Section title="Password">
      <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
        <Inp label="New password" value={pw} onChange={setPw} type="password" />
        <Inp label="Confirm password" value={cf} onChange={setCf} type="password" />
        {err && <div className="sm:col-span-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">{err}</div>}
        {msg && <div className="sm:col-span-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300">{msg}</div>}
        <div className="sm:col-span-2">
          <button disabled={busy} className="btn-gold rounded-full px-5 py-2 text-sm disabled:opacity-60">{busy ? "Updating…" : "Update password"}</button>
        </div>
      </form>
    </Section>
  );
}

function PreferencesCard() {
  const [prefs, setPrefs] = useState(() => {
    try { return JSON.parse(localStorage.getItem("pigm.prefs") || "{}"); } catch { return {}; }
  });
  function toggle(k: string, v?: boolean) {
    const next = { ...prefs, [k]: v ?? !prefs[k] };
    setPrefs(next);
    try { localStorage.setItem("pigm.prefs", JSON.stringify(next)); } catch {}
  }
  const items: [string, string, string][] = [
    ["notif_messages", "Message notifications", "Ping me when I get a new message"],
    ["notif_offers", "Offer & reservation updates", "Status changes on my listings"],
    ["notif_approvals", "Listing approvals", "When my listings are approved or need edits"],
    ["notif_promos", "Promotions", "Featured spots, boosts and news"],
    ["notif_security", "Security alerts", "New logins and account activity"],
    ["privacy_profile_public", "Public profile", "Show my profile to non-signed-in visitors"],
  ];
  return (
    <Section title="Notifications & privacy">
      <div className="grid gap-3">
        {items.map(([k, label, hint]) => (
          <label key={k} className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-4 py-3">
            <div>
              <p className="text-sm">{label}</p>
              <p className="text-xs text-silver/60">{hint}</p>
            </div>
            <input type="checkbox" checked={!!prefs[k]} onChange={() => toggle(k)} className="h-5 w-5 accent-[color:var(--gold)]" />
          </label>
        ))}
      </div>
    </Section>
  );
}

function SecurityCard({ email }: { email: string }) {
  return (
    <Section title="Security">
      <div className="grid gap-3">
        <Row label="Email" value={email} />
        <Row label="Two-Factor Authentication" value="Coming soon" cta="Ready to enable" />
        <Row label="Active sessions" value="This device" cta="Sign out all — soon" />
        <Row label="Login history" value="Recording activity" cta="Full history coming soon" />
        <Row label="Account recovery" value="Email recovery enabled" />
      </div>
    </Section>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="glass rounded-2xl border border-white/10 p-6">
      <h2 className="font-display text-xl text-gradient-gold">{title}</h2>
      <div className="mt-4">{children}</div>
    </div>
  );
}
function Row({ label, value, cta }: { label: string; value: string; cta?: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-4 py-3">
      <div>
        <p className="text-sm">{label}</p>
        <p className="text-xs text-silver/60">{value}</p>
      </div>
      {cta && <span className="text-[10px] uppercase tracking-widest text-gold">{cta}</span>}
    </div>
  );
}
function Inp({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <label className="block">
      <span className="text-xs text-silver/80">{label}</span>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-gold/40" />
    </label>
  );
}
