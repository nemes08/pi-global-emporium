/**
 * Pi App-to-User (A2U) payment flow.
 *
 * Pi A2U is a three-step protocol:
 *   1. create the payment on the Pi Platform API (POST /v2/payments)
 *   2. sign and submit a real Pi blockchain (Stellar) transaction from the app
 *      wallet to the recipient address returned in step 1
 *   3. complete the payment on the Pi Platform API with the transaction id
 *
 * Every step is server-only: the client never sees the app wallet seed, the
 * amount, or the recipient. Payments are recorded in `pi_payouts` before the
 * blockchain transfer so an interrupted run can always be recovered or
 * cancelled without double-spending.
 */
import {
  Account,
  Asset,
  BASE_FEE,
  Keypair,
  Memo,
  Operation,
  TransactionBuilder,
} from "@stellar/stellar-sdk";
import { requirePiConfig, type PiConfig } from "@/lib/pi-config.server";

const PI_API = "https://api.minepi.com/v2";

export type A2UPayment = {
  identifier: string;
  amount: number;
  recipient?: string;
  status?: {
    developer_approved?: boolean;
    transaction_verified?: boolean;
    developer_completed?: boolean;
    cancelled?: boolean;
    user_cancelled?: boolean;
  };
  transaction?: { txid?: string; verified?: boolean } | null;
  metadata?: Record<string, unknown>;
};

async function piApi<T>(config: PiConfig, path: string, method = "GET", body?: object): Promise<T> {
  const res = await fetch(`${PI_API}${path}`, {
    method,
    headers: {
      Authorization: `Key ${config.apiKey}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Pi Platform API ${method} ${path} failed (${res.status}): ${detail.slice(0, 200)}`);
  }
  return (await res.json()) as T;
}

/** Step 1 — reserve the payment on Pi's side. */
export async function createA2UPayment(
  config: PiConfig,
  input: { uid: string; amount: number; memo: string; metadata: Record<string, unknown> },
): Promise<A2UPayment> {
  const payload = {
    payment: {
      amount: input.amount,
      memo: input.memo.slice(0, 28),
      metadata: input.metadata,
      uid: input.uid,
    },
  };
  const created = await piApi<A2UPayment>(config, "/payments", "POST", payload);
  if (!created?.identifier) throw new Error("Pi did not return a payment identifier.");
  return created;
}

export async function getA2UPayment(config: PiConfig, paymentId: string): Promise<A2UPayment> {
  return piApi<A2UPayment>(config, `/payments/${encodeURIComponent(paymentId)}`);
}

/** Step 3 — mark the payment complete once the blockchain transfer settled. */
export async function completeA2UPayment(config: PiConfig, paymentId: string, txid: string): Promise<A2UPayment> {
  return piApi<A2UPayment>(config, `/payments/${encodeURIComponent(paymentId)}/complete`, "POST", { txid });
}

/** Cancel a reserved payment that can no longer be settled. */
export async function cancelA2UPayment(config: PiConfig, paymentId: string): Promise<A2UPayment> {
  return piApi<A2UPayment>(config, `/payments/${encodeURIComponent(paymentId)}/cancel`, "POST");
}

/** Payments Pi believes are still open on the app wallet — used for recovery. */
export async function listIncompleteServerPayments(config: PiConfig): Promise<A2UPayment[]> {
  const res = await piApi<{ incomplete_server_payments?: A2UPayment[] }>(
    config,
    "/payments/incomplete_server_payments",
  );
  return res.incomplete_server_payments ?? [];
}

type HorizonAccount = { id: string; sequence: string };

async function loadAccount(config: PiConfig, publicKey: string): Promise<Account> {
  const res = await fetch(`${config.horizonUrl}/accounts/${publicKey}`);
  if (!res.ok) {
    throw new Error(
      res.status === 404
        ? `The Pi app wallet (${publicKey.slice(0, 6)}…) does not exist on ${config.network}. Fund it before paying out.`
        : `Pi blockchain account lookup failed (${res.status}).`,
    );
  }
  const account = (await res.json()) as HorizonAccount;
  return new Account(account.id, account.sequence);
}

async function submitTransaction(config: PiConfig, xdr: string): Promise<string> {
  const res = await fetch(`${config.horizonUrl}/transactions`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ tx: xdr }).toString(),
  });
  const payload = (await res.json().catch(() => ({}))) as {
    hash?: string;
    successful?: boolean;
    extras?: { result_codes?: unknown };
    detail?: string;
  };
  if (!res.ok || !payload.hash) {
    const codes = JSON.stringify(payload.extras?.result_codes ?? payload.detail ?? {}).slice(0, 200);
    throw new Error(`Pi blockchain transfer was rejected (${res.status}): ${codes}`);
  }
  return payload.hash;
}

/**
 * Step 2 — sign and submit the real Pi blockchain transfer. The Pi payment
 * identifier travels in the transaction memo, which is how Pi's verifier links
 * the on-chain transaction to the reserved payment.
 */
export async function submitA2UTransfer(
  config: PiConfig,
  input: { recipient: string; amount: number; paymentId: string },
): Promise<string> {
  if (!config.walletSeed) throw new Error("Pi payouts are not configured: missing app wallet seed.");
  const keypair = Keypair.fromSecret(config.walletSeed);
  const source = await loadAccount(config, keypair.publicKey());

  const tx = new TransactionBuilder(source, {
    fee: BASE_FEE,
    networkPassphrase: config.networkPassphrase,
  })
    .addOperation(
      Operation.payment({
        destination: input.recipient,
        asset: Asset.native(),
        amount: input.amount.toFixed(7),
      }),
    )
    .addMemo(Memo.text(input.paymentId))
    .setTimeout(180)
    .build();

  tx.sign(keypair);
  return submitTransaction(config, tx.toXDR());
}

/**
 * Full A2U settlement: create (or resume) the payment, send the blockchain
 * transfer, then complete it on Pi's side. Idempotent per `paymentId`.
 */
export async function settleA2UPayment(input: {
  uid: string;
  amount: number;
  memo: string;
  metadata: Record<string, unknown>;
  existingPaymentId?: string | null;
  onReserved?: (paymentId: string) => Promise<void>;
  onSubmitted?: (paymentId: string, txid: string) => Promise<void>;
}): Promise<{ paymentId: string; txid: string }> {
  const config = requirePiConfig(true);

  let payment: A2UPayment;
  if (input.existingPaymentId) {
    payment = await getA2UPayment(config, input.existingPaymentId);
    if (payment.status?.cancelled) {
      throw new Error("This Pi payout was cancelled on Pi's side. Start a new payout.");
    }
  } else {
    payment = await createA2UPayment(config, input);
    await input.onReserved?.(payment.identifier);
  }

  if (Math.abs(Number(payment.amount) - input.amount) > 0.0000001) {
    throw new Error("Reserved Pi payout amount does not match the escrow amount.");
  }

  let txid = payment.transaction?.txid ?? null;
  if (!txid) {
    if (!payment.recipient) throw new Error("Pi did not return a recipient wallet address.");
    txid = await submitA2UTransfer(config, {
      recipient: payment.recipient,
      amount: input.amount,
      paymentId: payment.identifier,
    });
    await input.onSubmitted?.(payment.identifier, txid);
  }

  if (!payment.status?.developer_completed) {
    await completeA2UPayment(config, payment.identifier, txid);
  }

  return { paymentId: payment.identifier, txid };
}
