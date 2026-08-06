/**
 * Escrow payout orchestration on top of the Pi A2U flow.
 *
 * Authorization is enforced with the caller's own RLS client, then the
 * privileged client is used only to write the payout ledger and advance the
 * escrow. Payout rows exist before any blockchain transfer, which makes the
 * flow recoverable and prevents double payouts (see the partial unique index
 * on `pi_payouts`).
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { GCV_USD_PER_PI, PLATFORM_FEE_RATE } from "@/lib/pricing.constants";
import { assertNetworkMatch, requirePiConfig } from "@/lib/pi-config.server";
import {
  cancelA2UPayment,
  getA2UPayment,
  listIncompleteServerPayments,
  settleA2UPayment,
} from "@/lib/pi-a2u.server";

type AuthContext = { supabase: SupabaseClient<Database>; userId: string };
type PayoutKind = "release" | "refund";

type Escrow = {
  id: string;
  order_id: string;
  buyer_id: string;
  seller_id: string;
  amount_usd: number;
  status: string;
};

function toPi(usd: number): number {
  return Number((usd / GCV_USD_PER_PI).toFixed(7));
}

async function isAdmin(context: AuthContext): Promise<boolean> {
  const { data } = await context.supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", context.userId)
    .eq("role", "admin")
    .maybeSingle();
  return !!data;
}

async function loadEscrow(context: AuthContext, escrowId: string): Promise<Escrow> {
  const { data, error } = await context.supabase
    .from("escrows")
    .select("id,order_id,buyer_id,seller_id,amount_usd,status")
    .eq("id", escrowId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Escrow not found");
  return data as Escrow;
}

async function recipientProfile(escrowId: string, userId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("profiles")
    .select("pi_uid,pi_username,pi_sandbox")
    .eq("id", userId)
    .maybeSingle();
  if (!data?.pi_uid) {
    throw new Error(
      "The recipient has not connected a Pi wallet yet, so this payout cannot be sent. Ask them to connect Pi in their wallet settings.",
    );
  }
  void escrowId;
  return data;
}

/**
 * Release the escrowed Pi to the seller (minus the platform fee) or refund the
 * full amount to the buyer, as a real Pi blockchain transfer.
 */
export async function payoutEscrow(
  context: AuthContext,
  input: { escrowId: string; kind: PayoutKind },
): Promise<{ ok: true; paymentId: string; txId: string; amountPi: number }> {
  const config = requirePiConfig(true);
  const escrow = await loadEscrow(context, input.escrowId);
  const admin = await isAdmin(context);

  if (input.kind === "release") {
    const allowed = admin || context.userId === escrow.buyer_id;
    if (!allowed) throw new Error("Only the buyer or an administrator can release escrowed Pi.");
    if (!["delivered", "funded", "shipped"].includes(escrow.status)) {
      throw new Error("This escrow is not ready to be released.");
    }
  } else {
    const allowed = admin || context.userId === escrow.seller_id;
    if (!allowed) throw new Error("Only the seller or an administrator can refund escrowed Pi.");
    if (!["funded", "shipped", "delivered", "disputed"].includes(escrow.status)) {
      throw new Error("This escrow cannot be refunded in its current state.");
    }
  }

  const recipientId = input.kind === "release" ? escrow.seller_id : escrow.buyer_id;
  const profile = await recipientProfile(escrow.id, recipientId);
  assertNetworkMatch(config, profile.pi_sandbox ?? true);

  const amountUsd =
    input.kind === "release"
      ? Number((Number(escrow.amount_usd) * (1 - PLATFORM_FEE_RATE)).toFixed(2))
      : Number(Number(escrow.amount_usd).toFixed(2));
  const amountPi = toPi(amountUsd);
  if (!(amountPi > 0)) throw new Error("Payout amount must be greater than zero.");

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  // Resume an interrupted payout instead of creating a second one.
  const { data: existing } = await supabaseAdmin
    .from("pi_payouts")
    .select("id,pi_payment_id,pi_tx_id,status")
    .eq("escrow_id", escrow.id)
    .eq("kind", input.kind)
    .not("status", "in", "(failed,cancelled)")
    .maybeSingle();

  if (existing?.status === "completed" && existing.pi_payment_id && existing.pi_tx_id) {
    return { ok: true, paymentId: existing.pi_payment_id, txId: existing.pi_tx_id, amountPi };
  }

  let rowId = existing?.id ?? null;
  if (!rowId) {
    const { data: inserted, error: insertError } = await supabaseAdmin
      .from("pi_payouts")
      .insert({
        escrow_id: escrow.id,
        recipient_id: recipientId,
        kind: input.kind,
        amount_pi: amountPi,
        amount_usd: amountUsd,
        network: config.network,
        status: "pending",
      })
      .select("id")
      .single();
    if (insertError) throw new Error(insertError.message);
    rowId = inserted.id;
  }

  try {
    const settled = await settleA2UPayment({
      uid: profile.pi_uid!,
      amount: amountPi,
      memo: input.kind === "release" ? "Escrow release" : "Escrow refund",
      metadata: { escrowId: escrow.id, orderId: escrow.order_id, kind: input.kind, recipientId },
      existingPaymentId: existing?.pi_payment_id ?? null,
      onReserved: async (paymentId) => {
        await supabaseAdmin.from("pi_payouts").update({ pi_payment_id: paymentId }).eq("id", rowId!);
      },
      onSubmitted: async (_paymentId, txid) => {
        await supabaseAdmin.from("pi_payouts").update({ status: "submitted", pi_tx_id: txid }).eq("id", rowId!);
      },
    });

    await supabaseAdmin
      .from("pi_payouts")
      .update({ status: "completed", pi_payment_id: settled.paymentId, pi_tx_id: settled.txid, error: null })
      .eq("id", rowId!);

    const nextStatus = input.kind === "release" ? "released" : "refunded";
    const stamp = input.kind === "release" ? { released_at: new Date().toISOString() } : { refunded_at: new Date().toISOString() };
    await supabaseAdmin.from("escrows").update({ status: nextStatus, ...stamp }).eq("id", escrow.id);
    await supabaseAdmin
      .from("orders")
      .update({ status: input.kind === "release" ? "completed" : "refunded" })
      .eq("id", escrow.order_id);

    return { ok: true, paymentId: settled.paymentId, txId: settled.txid, amountPi };
  } catch (error) {
    const message = (error as Error).message.slice(0, 400);
    await supabaseAdmin.from("pi_payouts").update({ status: "failed", error: message }).eq("id", rowId!);
    throw new Error(message);
  }
}

/** Cancel a reserved-but-unsettled payout (admin only). */
export async function cancelPayout(context: AuthContext, input: { payoutId: string }) {
  if (!(await isAdmin(context))) throw new Error("Only an administrator can cancel a Pi payout.");
  const config = requirePiConfig();
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: row } = await supabaseAdmin
    .from("pi_payouts")
    .select("id,pi_payment_id,pi_tx_id,status")
    .eq("id", input.payoutId)
    .maybeSingle();
  if (!row) throw new Error("Payout not found");
  if (row.status === "completed") throw new Error("A completed Pi payout cannot be cancelled.");
  if (row.pi_tx_id) throw new Error("This payout already has a blockchain transaction and must be completed instead.");
  if (row.pi_payment_id) await cancelA2UPayment(config, row.pi_payment_id);
  await supabaseAdmin.from("pi_payouts").update({ status: "cancelled" }).eq("id", row.id);
  return { ok: true };
}

/**
 * Recover every payout Pi still considers open on the app wallet: finish the
 * ones with a blockchain transaction, cancel the ones without.
 */
export async function recoverPayouts(context: AuthContext) {
  if (!(await isAdmin(context))) throw new Error("Only an administrator can run Pi payout recovery.");
  const config = requirePiConfig(true);
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const open = await listIncompleteServerPayments(config);

  let completed = 0;
  let cancelled = 0;
  const failures: string[] = [];

  for (const payment of open) {
    const escrowId = payment.metadata?.["escrowId"];
    const kind = payment.metadata?.["kind"];
    if (typeof escrowId !== "string" || (kind !== "release" && kind !== "refund")) continue;
    try {
      const fresh = await getA2UPayment(config, payment.identifier);
      const { data: row } = await supabaseAdmin
        .from("pi_payouts")
        .select("id,recipient_id,amount_pi,amount_usd")
        .eq("pi_payment_id", payment.identifier)
        .maybeSingle();

      const settled = await settleA2UPayment({
        uid: String(fresh.metadata?.["recipientUid"] ?? ""),
        amount: Number(fresh.amount),
        memo: kind === "release" ? "Escrow release" : "Escrow refund",
        metadata: fresh.metadata ?? {},
        existingPaymentId: payment.identifier,
      });

      if (row) {
        await supabaseAdmin
          .from("pi_payouts")
          .update({ status: "completed", pi_tx_id: settled.txid, error: null })
          .eq("id", row.id);
      }
      await supabaseAdmin
        .from("escrows")
        .update(
          kind === "release"
            ? { status: "released", released_at: new Date().toISOString() }
            : { status: "refunded", refunded_at: new Date().toISOString() },
        )
        .eq("id", escrowId);
      completed += 1;
    } catch {
      try {
        await cancelA2UPayment(config, payment.identifier);
        await supabaseAdmin.from("pi_payouts").update({ status: "cancelled" }).eq("pi_payment_id", payment.identifier);
        cancelled += 1;
      } catch (e) {
        failures.push(`${payment.identifier}: ${(e as Error).message.slice(0, 120)}`);
      }
    }
  }

  return { ok: true as const, scanned: open.length, completed, cancelled, failures };
}
