import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { cancelPiPayout, piIntegrationStatus, recoverPiPayouts } from "@/lib/payout.functions";

type PayoutRow = {
  id: string;
  escrow_id: string;
  kind: string;
  amount_pi: number;
  amount_usd: number;
  status: string;
  network: string;
  pi_payment_id: string | null;
  pi_tx_id: string | null;
  error: string | null;
  created_at: string;
};

const TONE: Record<string, string> = {
  completed: "text-emerald-300",
  submitted: "text-sky-300",
  pending: "text-silver/70",
  cancelled: "text-neutral-300",
  failed: "text-red-300",
};

/** Operator view of App-to-User blockchain payouts, with recovery + cancel. */
export function PiPayoutsPanel() {
  const qc = useQueryClient();
  const recover = useServerFn(recoverPiPayouts);
  const cancel = useServerFn(cancelPiPayout);
  const status = useServerFn(piIntegrationStatus);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const { data: health } = useQuery({ queryKey: ["pi-health"], queryFn: () => status({}) });
  const { data: payouts = [] } = useQuery({
    queryKey: ["pi-payouts"],
    queryFn: async () => {
      const { data } = await supabase
        .from("pi_payouts")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      return (data ?? []) as PayoutRow[];
    },
  });

  async function run(fn: () => Promise<string>) {
    setBusy(true);
    setErr(null);
    setMsg(null);
    try {
      setMsg(await fn());
      qc.invalidateQueries({ queryKey: ["pi-payouts"] });
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section aria-labelledby="pi-payouts" className="mt-10">
      <h2 id="pi-payouts" className="mb-4 font-display text-2xl text-silver">
        Pi blockchain payouts (A2U)
      </h2>

      <div className="glass mb-4 flex flex-wrap items-center gap-3 rounded-2xl border border-white/10 p-4 text-xs">
        <Badge ok={!!health?.paymentsConfigured} label="Server API key" />
        <Badge ok={!!health?.payoutsConfigured} label="App wallet seed" />
        <span className="rounded-full border border-white/10 px-3 py-1 uppercase tracking-widest text-silver/70">
          {health?.network ?? "unknown"} network
        </span>
        <button
          disabled={busy}
          onClick={() =>
            run(async () => {
              const r = await recover({ data: {} });
              return `Recovery sweep: ${r.scanned} open payment(s), ${r.completed} completed, ${r.cancelled} cancelled.`;
            })
          }
          className="btn-gold ml-auto rounded-full px-4 py-2 text-xs disabled:opacity-50"
        >
          {busy ? "Working…" : "Recover open payouts"}
        </button>
      </div>

      {health?.networkError && (
        <p role="alert" className="mb-3 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-xs text-red-200">
          {health.networkError}
        </p>
      )}
      {err && (
        <p role="alert" className="mb-3 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-xs text-red-200">
          {err}
        </p>
      )}
      {msg && (
        <p role="status" className="mb-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-xs text-emerald-200">
          {msg}
        </p>
      )}

      {payouts.length === 0 ? (
        <p className="glass rounded-2xl border border-white/10 p-6 text-sm text-silver/60">
          No blockchain payouts yet — they appear when escrows are released or refunded.
        </p>
      ) : (
        <ul className="glass divide-y divide-white/5 rounded-2xl border border-white/10">
          {payouts.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center gap-3 p-4 text-xs">
              <span className="w-20 uppercase tracking-widest text-silver/60">{p.kind}</span>
              <span className="w-32 text-silver">
                {Number(p.amount_pi).toLocaleString(undefined, { maximumFractionDigits: 7 })} π
              </span>
              <span className="w-24 text-silver/60">${Number(p.amount_usd).toLocaleString()}</span>
              <span className={`w-24 uppercase tracking-widest ${TONE[p.status] ?? "text-silver/70"}`}>{p.status}</span>
              <span className="min-w-[160px] flex-1 truncate text-silver/50" title={p.pi_tx_id ?? ""}>
                {p.pi_tx_id ? `tx ${p.pi_tx_id}` : p.error ? p.error : "awaiting transfer"}
              </span>
              {p.status !== "completed" && p.status !== "cancelled" && !p.pi_tx_id && (
                <button
                  disabled={busy}
                  onClick={() =>
                    run(async () => {
                      await cancel({ data: { payoutId: p.id } });
                      return "Payout cancelled on Pi.";
                    })
                  }
                  className="rounded-full border border-white/10 px-3 py-1 text-silver/80 transition hover:border-red-400/40 hover:text-red-200"
                >
                  Cancel
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Badge({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className={`rounded-full border px-3 py-1 ${
        ok ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" : "border-amber-500/30 bg-amber-500/10 text-amber-200"
      }`}
    >
      {ok ? "✓" : "!"} {label}
    </span>
  );
}
