import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { useAuth } from "@/lib/auth";
import { isPiBrowser, piAuthenticate } from "@/lib/pi-sdk";
import { piNetworkConfig, piSignIn } from "@/lib/pi.functions";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in with Pi · Pi Global Marketplace" },
      { name: "description", content: "Sign in to Pi Global Marketplace with Pi Authentication from the Pi Browser. No password, no email address needed." },
      { property: "og:title", content: "Sign in with Pi · Pi Global Marketplace" },
      { property: "og:description", content: "Sign in with Pi Authentication from the Pi Browser." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { session, loading } = useAuth();
  const navigate = useNavigate();
  const signIn = useServerFn(piSignIn);
  const netConfig = useServerFn(piNetworkConfig);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const inPiBrowser = typeof window !== "undefined" && isPiBrowser();

  const { data: net } = useQuery({
    queryKey: ["pi-network-config"],
    queryFn: () => netConfig(),
    staleTime: 60 * 60 * 1000,
  });

  useEffect(() => {
    if (!loading && session) navigate({ to: "/dashboard" });
  }, [session, loading, navigate]);

  async function signInWithPi() {
    setErr(null);
    setBusy(true);
    try {
      // The network comes from server configuration — never from the browser.
      const cfg = net ?? (await netConfig());
      const authed = await piAuthenticate(cfg.sandbox);
      const r = await signIn({ data: { accessToken: authed.accessToken } });
      const { error } = await supabase.auth.setSession({
        access_token: r.accessToken,
        refresh_token: r.refreshToken,
      });
      if (error) throw error;
      navigate({ to: "/dashboard" });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Pi sign-in did not complete. Please try again from the Pi Browser.");
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
            <div className="mx-auto h-14 w-14 grid place-items-center rounded-full btn-gold text-onyx font-black text-2xl" aria-hidden="true">π</div>
            <h1 className="font-display text-3xl mt-3 text-gradient-gold">Sign in with Pi</h1>
            <p className="text-silver/70 text-sm mt-1">
              Pi Authentication is the only way to sign in here. No email address, no password.
            </p>
          </div>

          <button
            type="button"
            onClick={signInWithPi}
            disabled={busy}
            className="btn-gold w-full rounded-full px-4 py-3 text-sm font-semibold disabled:opacity-60 flex items-center justify-center gap-2 min-h-[44px]"
          >
            <span className="font-black" aria-hidden="true">π</span>
            {busy ? "Verifying with Pi…" : "Continue with Pi"}
          </button>

          <p className="text-[11px] text-silver/60 text-center mt-3 leading-relaxed">
            {inPiBrowser
              ? "Pi Browser detected. Your Pi username is confirmed on our server before you are signed in."
              : "Open this page inside the Pi Browser to sign in. Pi Authentication is not available in other browsers."}
          </p>

          {!inPiBrowser && (
            <a
              href="https://minepi.com/download/"
              target="_blank"
              rel="noreferrer"
              className="btn-ghost-silver mt-3 block rounded-full px-4 py-2.5 text-center text-xs"
            >
              Get the Pi Browser
            </a>
          )}

          {err && (
            <div role="alert" className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300 mt-4">
              {err}
            </div>
          )}

          <p className="mt-6 border-t border-white/10 pt-4 text-[10px] leading-relaxed text-silver/50">
            Pi Global Marketplace is an independent community application built by third-party developers. It is not
            operated, endorsed or approved by Pi Network. We never ask for your wallet passphrase, seed phrase or private key.
            {net ? ` Network: ${net.network}.` : ""}
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
}
