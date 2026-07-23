import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Reset Password · Pi Global Marketplace" },
      { name: "description", content: "Set a new password for your Pi Global Marketplace account." },
      { property: "og:title", content: "Reset Password · Pi Global Marketplace" },
      { property: "og:description", content: "Set a new password for your Pi Global Marketplace account." },
    ],
  }),
  component: ResetPassword,
});

function ResetPassword() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    // Supabase parses recovery tokens from the URL hash automatically.
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });
    supabase.auth.getSession().then(({ data }) => { if (data.session) setReady(true); });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null); setMsg(null);
    try {
      const pw = z.string().min(8).max(72).parse(password);
      if (pw !== confirm) throw new Error("Passwords do not match");
      setBusy(true);
      const { error } = await supabase.auth.updateUser({ password: pw });
      if (error) throw error;
      setMsg("Password updated. Redirecting to sign in…");
      await supabase.auth.signOut();
      setTimeout(() => navigate({ to: "/auth" }), 1200);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Something went wrong");
    } finally { setBusy(false); }
  }

  return (
    <div className="min-h-dvh flex flex-col">
      <Navbar />
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="glass w-full max-w-md rounded-2xl p-8 border border-white/10">
          <h1 className="font-display text-3xl text-gradient-gold text-center">Reset password</h1>
          {!ready ? (
            <p className="mt-4 text-center text-sm text-silver/70">
              Waiting for a valid recovery link… Open the link from your email on this device.
              <br /><Link to="/forgot-password" className="mt-2 inline-block text-gold hover:underline">Request a new link</Link>
            </p>
          ) : (
            <form onSubmit={submit} className="mt-6 space-y-3">
              <label className="block">
                <span className="text-xs text-silver/80">New password</span>
                <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-gold/40"
                  placeholder="At least 8 characters" autoComplete="new-password" />
              </label>
              <label className="block">
                <span className="text-xs text-silver/80">Confirm password</span>
                <input type="password" required value={confirm} onChange={(e) => setConfirm(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-gold/40"
                  autoComplete="new-password" />
              </label>
              {err && <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">{err}</div>}
              {msg && <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300">{msg}</div>}
              <button disabled={busy} className="btn-gold w-full rounded-full px-4 py-2.5 text-sm font-semibold disabled:opacity-60">
                {busy ? "Updating…" : "Update password"}
              </button>
            </form>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
