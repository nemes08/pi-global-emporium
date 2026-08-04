import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { isPiBrowser, piAuthenticateWithRecovery, type PiIncompletePayment } from "@/lib/pi-sdk";
import { linkPiIdentity, unlinkPiIdentity } from "@/lib/pi.functions";
import { recoverIncompletePiPayment } from "@/lib/escrow.functions";

type LinkedPi = {
  pi_uid: string | null;
  pi_username: string | null;
  pi_sandbox: boolean;
};

/**
 * Full Pi Wallet connect card:
 * - Detects Pi Browser
 * - Sandbox / Mainnet toggle (user-owned preference persisted on profile)
 * - Authenticates via the Pi SDK
 * - Verifies the token server-side and links pi_uid to the current profile
 */
export function PiConnectCard() {
  const { user } = useAuth();
  const link = useServerFn(linkPiIdentity);
  const unlink = useServerFn(unlinkPiIdentity);
  const recover = useServerFn(recoverIncompletePiPayment);

  const [linked, setLinked] = useState<LinkedPi | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [sandbox, setSandbox] = useState(true);

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
        setSandbox(data.pi_sandbox ?? true);
      });
  }, [user]);

  const inPiBrowser = typeof window !== "undefined" && isPiBrowser();

  async function connect() {
    setBusy(true); setErr(null); setOk(null);
    try {
      const authed = await piAuthenticateWithRecovery(sandbox, async (payment: PiIncompletePayment) => {
        const paymentId = payment.identifier;
        const escrowId = payment.metadata?.["escrowId"];
        if (!paymentId || typeof escrowId !== "string") return;
        await recover({ data: { paymentId, escrowId, txId: payment.transaction?.txid } });
      });
      const r = await link({ data: { accessToken: authed.accessToken, sandbox } });
      setLinked({ pi_uid: r.uid, pi_username: r.username, pi_sandbox: r.sandbox });
      setOk(`Connected as @${r.username}`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Pi connection failed.");
    } finally {
      setBusy(false);
    }
  }

  async function disconnect() {
    setBusy(true); setErr(null); setOk(null);
    try {
      await unlink({ data: {} });
      setLinked({ pi_uid: null, pi_username: null, pi_sandbox: sandbox });
      setOk("Pi identity disconnected.");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Disconnect failed.");
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
                ? `Linked on ${linked?.pi_sandbox ? "Testnet (Sandbox)" : "Mainnet"}`
                : inPiBrowser
                  ? "Pi Browser detected — ready to sign in."
                  : "Open this app in the Pi Browser to connect."}
            </p>
          </div>
          <span className={`h-2.5 w-2.5 rounded-full ${connected ? "bg-emerald-400" : "bg-silver/40"}`} />
        </div>

        <div className="mt-4 inline-flex rounded-full border border-white/10 bg-black/40 p-0.5 text-[11px]">
          <button
            type="button"
            onClick={() => setSandbox(true)}
            disabled={connected}
            className={`rounded-full px-3 py-1 ${sandbox ? "btn-gold text-onyx" : "text-silver/70"} disabled:opacity-50`}
          >
            Testnet
          </button>
          <button
            type="button"
            onClick={() => setSandbox(false)}
            disabled={connected}
            className={`rounded-full px-3 py-1 ${!sandbox ? "btn-gold text-onyx" : "text-silver/70"} disabled:opacity-50`}
          >
            Mainnet
          </button>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {!connected ? (
            <>
              <button
                type="button"
                onClick={connect}
                disabled={busy || !inPiBrowser}
                className="btn-gold rounded-full px-4 py-2 text-xs disabled:opacity-50"
              >
                {busy ? "Connecting…" : "Connect Pi Wallet"}
              </button>
              {!inPiBrowser && (
                <a
                  href="https://minepi.com/download/"
                  target="_blank"
                  rel="noreferrer"
                  className="btn-ghost-silver rounded-full px-4 py-2 text-xs"
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
              className="btn-ghost-silver rounded-full px-4 py-2 text-xs"
            >
              {busy ? "Disconnecting…" : "Disconnect"}
            </button>
          )}
        </div>

        {err && <p className="mt-3 text-xs text-destructive">{err}</p>}
        {ok && <p className="mt-3 text-xs text-emerald-300">{ok}</p>}

        <p className="mt-4 text-[10px] leading-relaxed text-silver/50">
          Sign-in returns your Pi UID and username. Payments become available once the store completes
          Pi Network's mainnet review.
        </p>
      </div>
    </div>
  );
}
