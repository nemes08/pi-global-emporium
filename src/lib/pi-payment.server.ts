import { GCV_USD_PER_PI } from "@/lib/pricing";

type AuthContext = { supabase: any; userId: string };
type Payment = { identifier?: string; amount?: number; metadata?: Record<string, unknown>; transaction?: { txid?: string; verified?: boolean } | null; status?: { developer_approved?: boolean; developer_completed?: boolean; cancelled?: boolean } };

function apiKey() {
  const key = process.env["PI_API_KEY"];
  if (!key) throw new Error("Pi payments are not configured yet.");
  return key;
}

async function piRequest(path: string, method = "GET", body?: object) {
  const response = await fetch(`https://api.minepi.com/v2/payments/${path}`, {
    method,
    headers: { Authorization: `Key ${apiKey()}`, Accept: "application/json", "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`Pi payment request failed (${response.status}): ${detail.slice(0, 160)}`);
  }
  return response.json() as Promise<Payment>;
}

async function ownedEscrow(context: AuthContext, escrowId: string) {
  const { data, error } = await context.supabase.from("escrows").select("id,buyer_id,amount_usd,status,order_id,pi_payment_id").eq("id", escrowId).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data || data.buyer_id !== context.userId) throw new Error("Escrow not found");
  return data;
}

function validatePayment(payment: Payment, escrow: any, paymentId: string) {
  if (payment.identifier && payment.identifier !== paymentId) throw new Error("Payment identifier mismatch");
  if (payment.status?.cancelled) throw new Error("This Pi payment was cancelled");
  if (payment.metadata?.["escrowId"] !== escrow.id || payment.metadata?.["orderId"] !== escrow.order_id) throw new Error("Payment metadata does not match this escrow");
  const expected = Number((Number(escrow.amount_usd) / GCV_USD_PER_PI).toFixed(7));
  if (!Number.isFinite(payment.amount) || Math.abs(Number(payment.amount) - expected) > 0.0000001) throw new Error("Payment amount does not match the escrow total");
}

export async function approvePayment(input: { escrowId: string; paymentId: string }, context: AuthContext) {
  const escrow = await ownedEscrow(context, input.escrowId);
  if (escrow.status !== "awaiting_payment") throw new Error("This escrow is not awaiting payment");
  const payment = await piRequest(encodeURIComponent(input.paymentId));
  validatePayment(payment, escrow, input.paymentId);
  if (!payment.status?.developer_approved) await piRequest(`${encodeURIComponent(input.paymentId)}/approve`, "POST");
  return { ok: true };
}

export async function completePayment(input: { escrowId: string; paymentId: string; txId: string }, context: AuthContext) {
  const escrow = await ownedEscrow(context, input.escrowId);
  if (escrow.status === "funded" && escrow.pi_payment_id === input.paymentId) return { ok: true, txId: input.txId };
  if (escrow.status !== "awaiting_payment") throw new Error("This escrow is not awaiting payment");
  let payment = await piRequest(encodeURIComponent(input.paymentId));
  validatePayment(payment, escrow, input.paymentId);
  if (!payment.status?.developer_approved) throw new Error("Pi payment has not been approved");
  if (!payment.status?.developer_completed) payment = await piRequest(`${encodeURIComponent(input.paymentId)}/complete`, "POST", { txid: input.txId });
  if (payment.transaction?.txid && payment.transaction.txid !== input.txId) throw new Error("Pi transaction identifier mismatch");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { error } = await supabaseAdmin.from("escrows").update({ status: "funded", pi_payment_id: input.paymentId, pi_tx_id: input.txId, funded_at: new Date().toISOString() }).eq("id", escrow.id).eq("status", "awaiting_payment");
  if (error) throw new Error(error.message);
  await supabaseAdmin.from("orders").update({ status: "paid", pi_tx_id: input.txId }).eq("id", escrow.order_id);
  return { ok: true, txId: input.txId };
}

export async function recoverPayment(input: { paymentId: string; escrowId: string; txId?: string }, context: AuthContext) {
  const escrow = await ownedEscrow(context, input.escrowId);
  const payment = await piRequest(encodeURIComponent(input.paymentId));
  validatePayment(payment, escrow, input.paymentId);
  if (payment.status?.developer_completed) return { ok: true, recovered: false };
  const txId = input.txId ?? payment.transaction?.txid;
  if (!txId) throw new Error("Incomplete Pi payment is waiting for a transaction");
  await completePayment({ escrowId: input.escrowId, paymentId: input.paymentId, txId }, context);
  return { ok: true, recovered: true };
}