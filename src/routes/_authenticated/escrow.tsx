import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AccountLayout } from "@/components/AccountLayout";
import { useAuth } from "@/lib/auth";
import { usePricing } from "@/lib/pricing";
import { isPiBrowser, piAuthenticateWithRecovery, piCreatePayment, type PiIncompletePayment } from "@/lib/pi-sdk";
import { approvePiPayment, fundEscrowWithPi, recoverIncompletePiPayment } from "@/lib/escrow.functions";
import { refundEscrowToBuyer, releaseEscrowToSeller } from "@/lib/payout.functions";
import { GCV_USD_PER_PI } from "@/lib/pricing";
import { supabase } from "@/integrations/supabase/client";
import {
  ESCROW_FLOW,
  ESCROW_LABEL,
  ESCROW_TONE,
  fetchEscrowEvents,
  fetchMyDisputes,
  fetchMyEscrows,
  flowIndex,
  openDispute,
  setEscrowStatus,
  type EscrowStatus,
  type EscrowWithOrder,
} from "@/lib/escrow";

export const Route = createFileRoute("/_authenticated/escrow")({
  head: () => ({
    meta: [
      { title: "Pi Escrow · Pi Global Marketplace" },
      {
        name: "description",
        content:
          "Track every Pi escrow: payment, delivery, buyer confirmation and release — with a full transaction timeline and dispute resolution.",
      },
      { property: "og:title", content: "Pi Escrow · Pi Global Marketplace" },
      { property: "og:description", content: "Secure Pi escrow with timeline tracking and dispute resolution." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: EscrowPage,
});

function EscrowPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [role, setRole] = useState<"buyer" | "seller">("buyer");
  const [openId, setOpenId] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const approvePayment = useServerFn(approvePiPayment);
  const completePayment = useServerFn(fundEscrowWithPi);
  const recoverPayment = useServerFn(recoverIncompletePiPayment);
  const releaseToSeller = useServerFn(releaseEscrowToSeller);
  const refundToBuyer = useServerFn(refundEscrowToBuyer);

  const uid = user?.id;

  const { data: escrows = [], isPending } = useQuery({
    queryKey: ["escrows", uid, role],
    queryFn: () => fetchMyEscrows(uid!, role),
    enabled: !!uid,
  });

  const { data: disputes = [] } = useQuery({
    queryKey: ["disputes", uid],
    queryFn: () => fetchMyDisputes(uid!),
    enabled: !!uid,
  });

  const { data: piSandbox = true } = useQuery({
    queryKey: ["pi-network", uid],
    queryFn: async () => {
      if (!uid) return true;
      const { data } = await supabase.from("profiles").select("pi_sandbox").eq("id", uid).maybeSingle();
      return data?.pi_sandbox ?? true;
    },
    enabled: !!uid,
  });

  const active = useMemo(
    () => escrows.filter((e) => !["released", "refunded", "cancelled"].includes(e.status)),
    [escrows],
  );
  const history = useMemo(
    () => escrows.filter((e) => ["released", "refunded", "cancelled"].includes(e.status)),
    [escrows],
  );

  function refresh() {
    qc.invalidateQueries({ queryKey: ["escrows", uid, role] });
    qc.invalidateQueries({ queryKey: ["disputes", uid] });
    qc.invalidateQueries({ queryKey: ["notifications"] });
  }

  async function act(escrow: EscrowWithOrder, status: EscrowStatus, label: string) {
    setBusy(escrow.id);
    setError(null);
    setNotice(null);
    const err = await setEscrowStatus(escrow.id, status);
    setBusy(null);
    if (err) setError(err);
    else {
      setNotice(label);
      refresh();
    }
  }

  async function recoverIncomplete(payment: PiIncompletePayment) {
    const paymentId = payment.identifier;
    const escrowId = payment.metadata?.["escrowId"];
    if (!paymentId || typeof escrowId !== "string") return;
    await recoverPayment({ data: { paymentId, escrowId, txId: payment.transaction?.txid } });
  }

  async function payWithPi(escrow: EscrowWithOrder) {
    setBusy(escrow.id);
    setError(null);
    setNotice(null);
    try {
      if (!isPiBrowser()) throw new Error("Open this page in the Pi Browser to pay with Pi.");
      await piAuthenticateWithRecovery(piSandbox, recoverIncomplete);
      const piAmount = Number((escrow.amount_usd / GCV_USD_PER_PI).toFixed(7));
      await new Promise<void>((resolve, reject) => {
        void piCreatePayment(
          {
            amount: piAmount,
            memo: `Pi Global Marketplace escrow ${escrow.id.slice(0, 8)}`,
            metadata: { escrowId: escrow.id, orderId: escrow.order_id },
          },
          {
            onReadyForServerApproval: (paymentId: string) => {
              void approvePayment({ data: { escrowId: escrow.id, paymentId } }).catch((e) => {
                reject(e instanceof Error ? e : new Error("Pi payment approval failed"));
              });
            },
            onReadyForServerCompletion: async (paymentId: string, txid: string) => {
              try {
                await completePayment({ data: { escrowId: escrow.id, paymentId, txId: txid } });
                resolve();
              } catch (e) {
                reject(e instanceof Error ? e : new Error("Escrow funding failed"));
              }
            },
            onCancel: () => reject(new Error("Pi payment cancelled")),
            onError: (e: Error) => reject(e),
          },
          piSandbox,
        );
      });
      setNotice("Pi payment verified — funds are held in escrow.");
      refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Pi payment failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <AccountLayout title="Pi Escrow">
      <p className="mb-5 max-w-2xl text-sm text-muted-foreground">
        Every transaction is protected: your Pi is held in escrow after payment and only released to the seller once you
        confirm delivery. Open a dispute at any point and our team reviews the case.
      </p>

      <div className="mb-4 flex flex-wrap items-center gap-2" role="tablist" aria-label="Escrow role">
        {(["buyer", "seller"] as const).map((k) => (
          <button
            key={k}
            role="tab"
            aria-selected={role === k}
            onClick={() => setRole(k)}
            className={`rounded-full border px-4 py-1.5 text-xs font-medium capitalize transition ${
              role === k ? "btn-gold border-transparent text-onyx" : "border-white/10 text-silver/80 hover:border-gold/30"
            }`}
          >
            {k === "buyer" ? "My purchases" : "My sales"}
          </button>
        ))}
      </div>

      {error && (
        <div role="alert" className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-xs text-red-200">
          {error}
        </div>
      )}
      {notice && (
        <div role="status" className="mb-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-xs text-emerald-200">
          {notice}
        </div>
      )}

      {isPending ? (
        <div className="space-y-3" aria-busy="true">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="glass h-28 animate-pulse rounded-2xl border border-white/10" />
          ))}
        </div>
      ) : escrows.length === 0 ? (
        <div className="glass rounded-3xl border border-white/10 p-12 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-gold/30 bg-gradient-to-br from-gold/20 to-transparent text-3xl">
            ⛨
          </div>
          <h2 className="mt-5 font-display text-2xl text-white">No escrow activity yet</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            {role === "buyer"
              ? "When you buy or reserve a listing, a protected Pi escrow is created automatically."
              : "Once a buyer reserves one of your listings, the escrow appears here with delivery actions."}
          </p>
          <Link to="/marketplace" className="btn-gold mt-6 inline-flex rounded-full px-6 py-2.5 text-xs">
            Explore marketplace
          </Link>
        </div>
      ) : (
        <div className="space-y-8">
          <section aria-labelledby="escrow-active">
            <h2 id="escrow-active" className="mb-3 text-[11px] uppercase tracking-widest text-silver/50">
              Active escrows ({active.length})
            </h2>
            {active.length === 0 ? (
              <p className="glass rounded-2xl border border-white/10 p-6 text-sm text-silver/60">
                No active escrows — everything is settled.
              </p>
            ) : (
              <ul className="space-y-3">
                {active.map((e) => (
                  <EscrowCard
                    key={e.id}
                    escrow={e}
                    role={role}
                    busy={busy === e.id}
                    expanded={openId === e.id}
                    dispute={disputes.find((d) => d.escrow_id === e.id) ?? null}
                    onToggle={() => setOpenId(openId === e.id ? null : e.id)}
                    onAct={act}
                    onPay={payWithPi}
                    onDisputed={refresh}
                    userId={uid!}
                  />
                ))}
              </ul>
            )}
          </section>

          <section aria-labelledby="escrow-history">
            <h2 id="escrow-history" className="mb-3 text-[11px] uppercase tracking-widest text-silver/50">
              Transaction history ({history.length})
            </h2>
            {history.length === 0 ? (
              <p className="glass rounded-2xl border border-white/10 p-6 text-sm text-silver/60">
                Completed escrows will be archived here.
              </p>
            ) : (
              <ul className="space-y-3">
                {history.map((e) => (
                  <EscrowCard
                    key={e.id}
                    escrow={e}
                    role={role}
                    busy={false}
                    expanded={openId === e.id}
                    dispute={disputes.find((d) => d.escrow_id === e.id) ?? null}
                    onToggle={() => setOpenId(openId === e.id ? null : e.id)}
                    onAct={act}
                    onPay={payWithPi}
                    onDisputed={refresh}
                    userId={uid!}
                  />
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </AccountLayout>
  );
}

function EscrowCard({
  escrow,
  role,
  busy,
  expanded,
  dispute,
  userId,
  onToggle,
  onAct,
  onPay,
  onDisputed,
}: {
  escrow: EscrowWithOrder;
  role: "buyer" | "seller";
  busy: boolean;
  expanded: boolean;
  dispute: { id: string; status: string; reason: string; resolution: string | null } | null;
  userId: string;
  onToggle: () => void;
  onAct: (e: EscrowWithOrder, s: EscrowStatus, label: string) => void;
  onPay: (e: EscrowWithOrder) => void;
  onDisputed: () => void;
}) {
  const { usdPerPi } = usePricing();
  const [showDispute, setShowDispute] = useState(false);
  const [reason, setReason] = useState("Item not as described");
  const [details, setDetails] = useState("");
  const [dErr, setDErr] = useState<string | null>(null);
  const title = escrow.orders?.listings?.title || "Listing";
  const pi = escrow.amount_usd / usdPerPi;

  const { data: events = [] } = useQuery({
    queryKey: ["escrow-events", escrow.id],
    queryFn: () => fetchEscrowEvents(escrow.id),
    enabled: expanded,
  });

  const canDispute = ["funded", "shipped", "delivered"].includes(escrow.status);

  async function submitDispute(ev: React.FormEvent) {
    ev.preventDefault();
    setDErr(null);
    if (details.trim().length > 1000) {
      setDErr("Details must be under 1000 characters.");
      return;
    }
    const err = await openDispute({ escrow, openedBy: userId, reason, details });
    if (err) setDErr(err);
    else {
      setShowDispute(false);
      setDetails("");
      onDisputed();
    }
  }

  return (
    <li className="glass rounded-2xl border border-white/10 p-4">
      <div className="flex flex-wrap items-start gap-3">
        <div className="min-w-[180px] flex-1">
          <Link
            to="/listing/$id"
            params={{ id: escrow.orders?.listing_id ?? "" }}
            className="text-sm font-medium text-white hover:text-gold"
          >
            {title}
          </Link>
          <p className="mt-0.5 text-[10px] text-silver/50">
            Escrow #{escrow.id.slice(0, 8)} · {new Date(escrow.created_at).toLocaleDateString()}
          </p>
          {escrow.pi_tx_id && <p className="text-[10px] break-all text-silver/50">Pi TX: {escrow.pi_tx_id}</p>}
        </div>
        <div className="text-right">
          <p className="font-display text-lg text-gradient-gold">
            {pi.toLocaleString(undefined, { maximumFractionDigits: 5 })} π
          </p>
          <p className="text-[10px] text-silver/50">${escrow.amount_usd.toLocaleString()}</p>
        </div>
        <span className={`rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-widest ${ESCROW_TONE[escrow.status]}`}>
          {ESCROW_LABEL[escrow.status]}
        </span>
      </div>

      <EscrowProgress status={escrow.status} />

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {role === "buyer" && escrow.status === "awaiting_payment" && (
          <button
            disabled={busy}
            onClick={() => onPay(escrow)}
            className="btn-gold rounded-full px-4 py-2 text-xs disabled:opacity-50"
          >
            {busy ? "Processing…" : "Pay with Pi"}
          </button>
        )}
        {role === "buyer" && escrow.status === "awaiting_payment" && (
          <ActionBtn busy={busy} onClick={() => onAct(escrow, "cancelled", "Order cancelled.")}>
            Cancel order
          </ActionBtn>
        )}
        {role === "seller" && escrow.status === "funded" && (
          <button
            disabled={busy}
            onClick={() => onAct(escrow, "shipped", "Marked as shipped — the buyer has been notified.")}
            className="btn-gold rounded-full px-4 py-2 text-xs disabled:opacity-50"
          >
            Mark as shipped
          </button>
        )}
        {role === "seller" && ["funded", "shipped"].includes(escrow.status) && (
          <ActionBtn busy={busy} onClick={() => onAct(escrow, "refunded", "Escrow refunded to the buyer.")}>
            Refund buyer
          </ActionBtn>
        )}
        {role === "buyer" && escrow.status === "shipped" && (
          <button
            disabled={busy}
            onClick={() => onAct(escrow, "delivered", "Delivery confirmed.")}
            className="btn-gold rounded-full px-4 py-2 text-xs disabled:opacity-50"
          >
            Confirm delivery
          </button>
        )}
        {role === "buyer" && escrow.status === "delivered" && (
          <button
            disabled={busy}
            onClick={() => onAct(escrow, "released", "Pi released to the seller.")}
            className="btn-gold rounded-full px-4 py-2 text-xs disabled:opacity-50"
          >
            Release Pi to seller
          </button>
        )}
        {canDispute && !dispute && (
          <ActionBtn busy={busy} onClick={() => setShowDispute((v) => !v)}>
            Open dispute
          </ActionBtn>
        )}
        <button
          onClick={onToggle}
          aria-expanded={expanded}
          className="rounded-full border border-white/10 px-4 py-2 text-xs text-silver/80 transition hover:border-gold/30 hover:text-white"
        >
          {expanded ? "Hide timeline" : "View timeline"}
        </button>
      </div>

      {dispute && (
        <div className="mt-3 rounded-xl border border-red-500/25 bg-red-500/5 p-3 text-xs text-red-200">
          Dispute <span className="uppercase tracking-widest">{dispute.status.replace(/_/g, " ")}</span> — {dispute.reason}
          {dispute.resolution && <p className="mt-1 text-silver/70">Resolution: {dispute.resolution}</p>}
        </div>
      )}

      {showDispute && (
        <form onSubmit={submitDispute} className="mt-3 space-y-2 rounded-xl border border-white/10 bg-black/30 p-3">
          <label htmlFor={`reason-${escrow.id}`} className="block text-[10px] uppercase tracking-widest text-silver/60">
            Dispute reason
          </label>
          <select
            id={`reason-${escrow.id}`}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-xs text-silver"
          >
            {["Item not as described", "Item never delivered", "Damaged on arrival", "Seller unresponsive", "Other"].map(
              (r) => (
                <option key={r} value={r} className="bg-onyx">
                  {r}
                </option>
              ),
            )}
          </select>
          <label htmlFor={`details-${escrow.id}`} className="block text-[10px] uppercase tracking-widest text-silver/60">
            Details
          </label>
          <textarea
            id={`details-${escrow.id}`}
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            maxLength={1000}
            rows={3}
            className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-xs text-silver"
            placeholder="Describe what went wrong so our team can resolve it quickly."
          />
          {dErr && <p className="text-[11px] text-red-300">{dErr}</p>}
          <div className="flex gap-2">
            <button type="submit" className="btn-gold rounded-full px-4 py-2 text-xs">
              Submit dispute
            </button>
            <button
              type="button"
              onClick={() => setShowDispute(false)}
              className="rounded-full border border-white/10 px-4 py-2 text-xs text-silver/80"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {expanded && (
        <ol className="mt-4 space-y-2 border-l border-white/10 pl-4">
          {events.length === 0 ? (
            <li className="text-xs text-silver/50">No timeline entries yet.</li>
          ) : (
            events.map((ev) => (
              <li key={ev.id} className="relative text-xs text-silver/80">
                <span className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full bg-gold" aria-hidden="true" />
                <span className="text-white">{ESCROW_LABEL[ev.status]}</span>
                <span className="text-silver/50"> · {new Date(ev.created_at).toLocaleString()}</span>
                {ev.note && <p className="text-silver/60">{ev.note}</p>}
              </li>
            ))
          )}
        </ol>
      )}
    </li>
  );
}

function ActionBtn({ children, busy, onClick }: { children: React.ReactNode; busy: boolean; onClick: () => void }) {
  return (
    <button
      disabled={busy}
      onClick={onClick}
      className="rounded-full border border-white/10 px-4 py-2 text-xs text-silver/80 transition hover:border-gold/30 hover:text-white disabled:opacity-50"
    >
      {children}
    </button>
  );
}

function EscrowProgress({ status }: { status: EscrowStatus }) {
  const idx = flowIndex(status);
  const off = ["refunded", "cancelled", "disputed"].includes(status);
  return (
    <ol className="mt-3 flex flex-wrap items-center gap-1.5" aria-label="Escrow progress">
      {ESCROW_FLOW.map((s, i) => {
        const done = !off && i <= idx;
        return (
          <li key={s} className="flex items-center gap-1.5">
            <span
              className={`rounded-full border px-2 py-0.5 text-[9px] uppercase tracking-widest ${
                done ? "border-gold/40 bg-gold/15 text-gold" : "border-white/10 text-silver/40"
              }`}
            >
              {ESCROW_LABEL[s]}
            </span>
            {i < ESCROW_FLOW.length - 1 && <span aria-hidden="true" className="text-silver/25">→</span>}
          </li>
        );
      })}
    </ol>
  );
}
