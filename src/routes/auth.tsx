import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { isPiBrowser, piAuthenticate } from "@/lib/pi-sdk";
import { piSignIn } from "@/lib/pi.functions";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign In · Pi Global Marketplace" },
      { name: "description", content: "Sign in or create your Pi Global Marketplace account to buy, sell and manage listings in the Pi ecosystem." },
      { property: "og:title", content: "Sign In · Pi Global Marketplace" },
      { property: "og:description", content: "Sign in or create your Pi Global Marketplace account." },
    ],
  }),
  component: AuthPage,
});

const emailSchema = z.string().trim().email().max(255);
const passwordSchema = z.string().min(8).max(72);

function AuthPage() {
  const { session, loading } = useAuth();
  const navigate = useNavigate();
  const signIn = useServerFn(piSignIn);
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [piBusy, setPiBusy] = useState(false);
  const [piErr, setPiErr] = useState<string | null>(null);
  const inPiBrowser = typeof window !== "undefined" && isPiBrowser();

  useEffect(() => {
    if (!loading && session) navigate({ to: "/dashboard" });
  }, [session, loading, navigate]);

  async function signInWithPi() {
    setPiErr(null); setPiBusy(true);
    try {
      // sandbox=false -> mainnet. Flip to true only while testing in the
      // Pi Testnet Sandbox inside the Pi Developer Portal.
      const authed = await piAuthenticate(false);
      const r = await signIn({ data: { accessToken: authed.accessToken, sandbox: false } });
      const { error } = await supabase.auth.setSession({
        access_token: r.accessToken,
        refresh_token: r.refreshToken,
      });
      if (error) throw error;
      navigate({ to: "/dashboard" });
    } catch (e) {
      setPiErr(e instanceof Error ? e.message : "Pi Wallet sign-in failed.");
    } finally {
      setPiBusy(false);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null); setMsg(null);
    try {
      const em = emailSchema.parse(email);
      const pw = passwordSchema.parse(password);
      setBusy(true);
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email: em,
          password: pw,
          options: {
            emailRedirectTo: `${window.location.origin}/dashboard`,
            data: {
              full_name: fullName.trim(),
              username: username.trim() || em.split("@")[0],
            },
          },
        });
        if (error) throw error;
        setMsg("Check your inbox to confirm your email, then sign in.");
        setMode("signin");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: em, password: pw });
        if (error) throw error;
        navigate({ to: "/dashboard" });
      }
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Something went wrong";
      setErr(message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-dvh flex flex-col">
      <Navbar />
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="glass w-full max-w-md rounded-2xl p-8 border border-white/10">
          <div className="text-center mb-6">
            <div className="mx-auto h-14 w-14 grid place-items-center rounded-full btn-gold text-onyx font-black text-2xl">π</div>
            <h1 className="font-display text-3xl mt-3 text-gradient-gold">
              {mode === "signin" ? "Welcome Back" : "Create Your Account"}
            </h1>
            <p className="text-silver/70 text-sm mt-1">
              {mode === "signin" ? "Sign in to your Pi Global account" : "Join the Pi Global Marketplace"}
            </p>
          </div>

          <button
            type="button"
            onClick={signInWithPi}
            disabled={piBusy}
            className="btn-gold w-full rounded-full px-4 py-2.5 text-sm font-semibold disabled:opacity-60 flex items-center justify-center gap-2"
          >
            <span className="font-black">π</span>
            {piBusy ? "Connecting…" : "Sign in with Pi Wallet"}
          </button>
          <p className="text-[10px] text-silver/50 text-center mt-2">
            {inPiBrowser
              ? "Pi Browser detected — this signs you in instantly, no password needed."
              : "Open this page inside the Pi Browser to sign in with your Pi Wallet."}
          </p>

          {piErr && <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300 mt-3">{piErr}</div>}

          <details className="mt-6 pt-5 border-t border-white/10">
            <summary className="cursor-pointer text-xs text-silver/60 text-center select-none">
              Not on the Pi Browser? Use email instead
            </summary>

          <div className="flex rounded-full border border-white/10 bg-white/5 p-1 mb-6 mt-4">
            <button
              onClick={() => { setMode("signin"); setErr(null); setMsg(null); }}
              className={`flex-1 rounded-full px-3 py-1.5 text-xs font-medium transition ${mode === "signin" ? "btn-gold text-onyx" : "text-silver/80"}`}
            >Sign In</button>
            <button
              onClick={() => { setMode("signup"); setErr(null); setMsg(null); }}
              className={`flex-1 rounded-full px-3 py-1.5 text-xs font-medium transition ${mode === "signup" ? "btn-gold text-onyx" : "text-silver/80"}`}
            >Register</button>
          </div>

          <form onSubmit={submit} className="space-y-3">
            {mode === "signup" && (
              <>
                <Field label="Full Name" value={fullName} onChange={setFullName} placeholder="Ada Lovelace" required />
                <Field label="Username" value={username} onChange={setUsername} placeholder="ada" />
              </>
            )}
            <Field label="Email" type="email" value={email} onChange={setEmail} placeholder="you@example.com" required autoComplete="email" />
            <Field label="Password" type="password" value={password} onChange={setPassword} placeholder="At least 8 characters" required autoComplete={mode === "signin" ? "current-password" : "new-password"} />

            {mode === "signin" && (
              <div className="text-right">
                <Link to="/forgot-password" className="text-xs text-gold hover:underline">Forgot password?</Link>
              </div>
            )}

            {err && <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">{err}</div>}
            {msg && <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300">{msg}</div>}

            <button disabled={busy} className="btn-gold w-full rounded-full px-4 py-2.5 text-sm font-semibold disabled:opacity-60">
              {busy ? "Please wait…" : mode === "signin" ? "Sign In" : "Create Account"}
            </button>
          </form>
          </details>
        </div>
      </main>
      <Footer />
    </div>
  );
}

function Field({
  label, value, onChange, type = "text", placeholder, required, autoComplete,
}: {
  label: string; value: string; onChange: (v: string) => void;
  type?: string; placeholder?: string; required?: boolean; autoComplete?: string;
}) {
  return (
    <label className="block">
      <span className="text-xs text-silver/80">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        autoComplete={autoComplete}
        className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-silver/40 focus:outline-none focus:ring-2 focus:ring-gold/40"
      />
    </label>
  );
}
