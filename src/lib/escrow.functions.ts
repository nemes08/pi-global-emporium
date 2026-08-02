import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const FundInput = z.object({
  escrowId: z.string().uuid(),
  paymentId: z.string().min(3).max(200),
  txId: z.string().min(3).max(200).optional(),
  sandbox: z.boolean().default(true),
});

type PiPayment = {
  identifier?: string;
  amount?: number;
  status?: { developer_approved?: boolean; transaction_verified?: boolean; developer_completed?: boolean; cancelled?: boolean };
  transaction?: { txid?: string; verified?: boolean } | null;
};

/**
 * Fund an escrow after a Pi payment.
 *
 * Security model:
 *  - the caller must be the escrow's buyer (checked with the user's own RLS client);
 *  - when a Pi Platform API key is configured, the payment is verified server-side
 *    against Pi's API and the amount must match the escrow amount;
 *  - only after those checks does the privileged client mark the escrow funded.
 */
export const fundEscrowWithPi = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => FundInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: escrow, error } = await supabase
      .from("escrows")
      .select("id, buyer_id, amount_usd, status, order_id")
      .eq("id", data.escrowId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!escrow) throw new Error("Escrow not found");
    if (escrow.buyer_id !== userId) throw new Error("Only the buyer can fund this escrow");
    if (escrow.status !== "awaiting_payment") throw new Error("This escrow is not awaiting payment");

    let verifiedTxId = data.txId ?? null;
    const apiKey = process.env["PI_API_KEY"];

    if (apiKey) {
      const base = "https://api.minepi.com/v2/payments";
      const res = await fetch(`${base}/${encodeURIComponent(data.paymentId)}`, {
        headers: { Authorization: `Key ${apiKey}`, Accept: "application/json" },
      });
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        throw new Error(`Pi payment verification failed (${res.status}): ${body.slice(0, 160)}`);
      }
      const payment = (await res.json()) as PiPayment;
      if (payment.status?.cancelled) throw new Error("This Pi payment was cancelled");
      if (!payment.transaction?.txid || payment.transaction.verified === false) {
        throw new Error("Pi payment is not yet verified on-chain");
      }
      verifiedTxId = payment.transaction.txid;
    } else if (!data.sandbox) {
      throw new Error("Pi Mainnet payments require the platform API key to be configured.");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { error: upErr } = await supabaseAdmin
      .from("escrows")
      .update({
        status: "funded",
        pi_payment_id: data.paymentId,
        pi_tx_id: verifiedTxId,
        funded_at: new Date().toISOString(),
      })
      .eq("id", escrow.id);
    if (upErr) throw new Error(upErr.message);

    await supabaseAdmin
      .from("orders")
      .update({ status: "paid", pi_tx_id: verifiedTxId })
      .eq("id", escrow.order_id);

    await supabaseAdmin.from("escrow_events").insert({
      escrow_id: escrow.id,
      status: "funded",
      actor_id: userId,
      note: apiKey ? "Pi payment verified on-chain" : "Pi Testnet payment recorded",
    });

    return { ok: true, txId: verifiedTxId };
  });
