/**
 * Pi Network SDK integration surface.
 *
 * This module provides typed stubs for Pi Browser SDK. The Pi SDK is only
 * available inside the Pi Browser runtime; outside of it, all methods reject
 * with a well-typed error. Live Pi payments are NOT enabled yet — these are
 * clean integration points ready for the Pi Wallet + Pi Payments rollout.
 */

export type PiUser = {
  uid: string;
  username: string;
  accessToken?: string;
};

export type PiPaymentData = {
  amount: number;              // amount in Pi
  memo: string;
  metadata: Record<string, unknown>;
  identifier?: string;         // marketplace order id
  to_address?: string;
};

export type PiPaymentCallbacks = {
  onReadyForServerApproval?: (paymentId: string) => void;
  onReadyForServerCompletion?: (paymentId: string, txid: string) => void;
  onCancel?: (paymentId: string) => void;
  onError?: (error: Error, payment?: unknown) => void;
};

type PiWindow = {
  Pi?: {
    init: (opts: { version: string; sandbox?: boolean }) => void;
    authenticate: (
      scopes: string[],
      onIncompletePaymentFound: (payment: unknown) => void,
    ) => Promise<PiUser>;
    createPayment: (data: PiPaymentData, callbacks: PiPaymentCallbacks) => void;
  };
};

export function isPiBrowser(): boolean {
  if (typeof window === "undefined") return false;
  const w = window as unknown as PiWindow & { navigator: Navigator };
  if (w.Pi) return true;
  return /PiBrowser/i.test(w.navigator?.userAgent ?? "");
}

export function initPiSdk(sandbox = true) {
  if (typeof window === "undefined") return;
  const w = window as unknown as PiWindow;
  try { w.Pi?.init({ version: "2.0", sandbox }); } catch { /* no-op */ }
}

export async function piAuthenticate(): Promise<PiUser> {
  if (typeof window === "undefined") throw new Error("Pi SDK unavailable (server).");
  const w = window as unknown as PiWindow;
  if (!w.Pi) throw new Error("Pi SDK not detected. Please open this app in the Pi Browser.");
  return w.Pi.authenticate(["username", "payments"], () => {
    /* incomplete payment recovery hook — wire to backend when payments go live */
  });
}

export function piCreatePayment(data: PiPaymentData, cb: PiPaymentCallbacks) {
  if (typeof window === "undefined") throw new Error("Pi SDK unavailable (server).");
  const w = window as unknown as PiWindow;
  if (!w.Pi) throw new Error("Pi SDK not detected. Please open this app in the Pi Browser.");
  w.Pi.createPayment(data, cb);
}

/** Human-readable status for UI CTAs when the SDK is not available. */
export function piAvailability(): { available: boolean; label: string } {
  const available = isPiBrowser();
  return {
    available,
    label: available
      ? "Pi Browser detected"
      : "Open in Pi Browser to enable Pi Wallet",
  };
}
