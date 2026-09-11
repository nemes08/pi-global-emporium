import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { isPiBrowser, piAuthenticateWithRecovery, type PiIncompletePayment } from "@/lib/pi-sdk";
import { linkPiIdentity, piNetworkConfig, unlinkPiIdentity } from "@/lib/pi.functions";
import { recoverIncompletePiPayment } from "@/lib/escrow.functions";

type LinkedPi = {
  pi_uid: string | null;
  pi_username: string | null;
  pi_sandbox: boolean;
};

/**
 * Pi Wallet connect card.
 *
 * The network (Mainnet / Testnet) is decided by server configuration only —
 * there is deliberately no user-facing network switch.
 */
export function PiConnectCard() {
  const { user } = useAuth();
  const link = useServerFn(linkPiIdentity);
  const unlink = useServerFn(unlinkPiIdentity);
  const recover = useServerFn(recoverIncompletePiPayment);
  const netConfig = useServerFn(piNetworkConfig);

  const [linked, setLinked] = useState<LinkedPi | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const { data: net } = useQuery({
    queryKey: ["pi-network-config"],
    queryFn: () => netConfig(),
    staleTime: 60 * 60 * 1000,
  });

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("pi_uid, pi_username, pi_sandbox")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) return;
        setLinked(data as LinkedPi);
      });
  }, [user]);

  const inPiBrowser = typeof window !== "undefined" && isPiBrowser();

  async function connect() {
    setBusy(true); setErr(null); setOk(null);
    try {
      const cfg = net ?? (await netConfig());
      const authed = await piAuthenticateWithRecovery(cfg.sandbox, async (payment: PiIncompletePayment) => {
        const paymentId = payment.identifier;
        const escrowId = payment.metadata?.["escrowId"];
        if (!paymentId || typeof escrowId !== "string") return;
        await recover({ data: { paymentId, escrowId, txId: payment.transaction?.txid } });
      });
      const r = await link({ data: { accessToken: authed.accessToken } });
      setLinked({ pi_uid: r.uid, pi_username: r.username, pi_sandbox: r.sandbox });
      setOk(`Connected as @${r.username}`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Pi connection did not complete. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function disconnect() {
    setBusy(true); setErr(null); setOk(null);
    try {
      await unlink({ data: {} });
      setLinked({ pi_uid: null, pi_username: null, pi_sandbox: linked?.pi_sandbox ?? false });
      setOk("Pi identity disconnected.");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Disconnect did not complete. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  const connected = !!linked?.pi_uid;

  return (
    <div className="glass-strong rounded-3xl p-6 border border-gold/30 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none opacity-20 bg-gradient-to-br from-gold/40 via-transparent to-transparent" />
      <div className="relative">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-widest text-gold">Pi Wallet</p>
            <p className="mt-1 font-display text-xl text-white">
              {connected ? `@${linked?.pi_username}` : "Not connected"}
            </p>
            <p className="mt-1 text-[11px] text-silver/60">
              {connected
                ? `Linked on ${net?.network === "testnet" ? "Testnet" : "Mainnet"}`
                : inPiBrowser
                  ? "Pi Browser detected — ready to sign in."
                  : "Open this app in the Pi Browser to connect."}
            </p>
          </div>
          <span className={`h-2.5 w-2.5 rounded-full ${connected ? "bg-emerald-400" : "bg-silver/40"}`} />
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {!connected ? (
            <>
              <button
                type="button"
                onClick={connect}
                disabled={busy || !inPiBrowser}
                className="btn-gold rounded-full px-4 py-2.5 text-xs disabled:opacity-50 min-h-[44px]"
              >
                {busy ? "Connecting…" : "Connect Pi Wallet"}
              </button>
              {!inPiBrowser && (
                <a
                  href="https://minepi.com/download/"
                  target="_blank"
                  rel="noreferrer"
                  className="btn-ghost-silver rounded-full px-4 py-2.5 text-xs min-h-[44px] inline-flex items-center"
                >
                  Get Pi Browser
                </a>
              )}
            </>
          ) : (
            <button
              type="button"
              onClick={disconnect}
              disabled={busy}
              className="btn-ghost-silver rounded-full px-4 py-2.5 text-xs min-h-[44px]"
            >
              {busy ? "Disconnecting…" : "Disconnect"}
            </button>
          )}
        </div>

        {err && <p role="alert" className="mt-3 text-xs text-destructive">{err}</p>}
        {ok && <p className="mt-3 text-xs text-emerald-300">{ok}</p>}

        <p className="mt-4 text-[10px] leading-relaxed text-silver/50">
          Signing in confirms your Pi UID and username on our server. We never ask for your wallet passphrase, seed
          phrase or private key.
        </p>
      </div>
    </div>
  );
}
