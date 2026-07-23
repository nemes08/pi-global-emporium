import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({
    meta: [
      { title: "Forgot Password · Pi Global Marketplace" },
      { name: "description", content: "Reset your Pi Global Marketplace password. We'll send you a secure recovery link." },
      { property: "og:title", content: "Forgot Password · Pi Global Marketplace" },
      { property: "og:description", content: "Recover access to your Pi Global Marketplace account." },
    ],
  }),
  component: ForgotPassword,
});

function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null); setMsg(null);
    try {
      const em = z.string().trim().email().max(255).parse(email);
      setBusy(true);
      const { error } = await supabase.auth.resetPasswordForEmail(em, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      setMsg("If an account exists for this email, a recovery link has been sent.");
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Something went wrong");
    } finally { setBusy(false); }
  }

  return (
    <div className="min-h-dvh flex flex-col">
      <Navbar />
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="glass w-full max-w-md rounded-2xl p-8 border border-white/10">
          <h1 className="font-display text-3xl text-gradient-gold text-center">Forgot password?</h1>
          <p className="text-silver/70 text-sm text-center mt-1">Enter your email to receive a recovery link.</p>
          <form onSubmit={submit} className="mt-6 space-y-3">
            <label className="block">
              <span className="text-xs text-silver/80">Email</span>
              <input
                type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-silver/40 focus:outline-none focus:ring-2 focus:ring-gold/40"
                placeholder="you@example.com"
              />
            </label>
            {err && <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">{err}</div>}
            {msg && <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300">{msg}</div>}
            <button disabled={busy} className="btn-gold w-full rounded-full px-4 py-2.5 text-sm font-semibold disabled:opacity-60">
              {busy ? "Sending…" : "Send recovery link"}
            </button>
          </form>
          <div className="mt-4 text-center text-xs text-silver/70">
            <Link to="/auth" className="text-gold hover:underline">Back to sign in</Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
