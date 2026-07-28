/**
 * Pi Network SDK integration.
 *
 * Loads the official Pi Browser SDK (https://sdk.minepi.com/pi-sdk.js) on
 * demand, exposes typed helpers for authentication and payments, and supports
 * BOTH sandbox and mainnet. Outside the Pi Browser, {@link isPiBrowser}
 * returns false and calls reject with a clear error — never throw silently.
 */

export type PiUser = {
  uid: string;
  username: string;
  accessToken: string;
};

export type PiPaymentData = {
  amount: number;              // amount in Pi
  memo: string;
  metadata: Record<string, unknown>;
};

export type PiPaymentCallbacks = {
  onReadyForServerApproval?: (paymentId: string) => void;
  onReadyForServerCompletion?: (paymentId: string, txid: string) => void;
  onCancel?: (paymentId: string) => void;
  onError?: (error: Error, payment?: unknown) => void;
};

type PiAuthResult = {
  user: { uid: string; username: string };
  accessToken: string;
};

type PiSdkGlobal = {
  init: (opts: { version: string; sandbox?: boolean }) => void;
  authenticate: (
    scopes: string[],
    onIncompletePaymentFound: (payment: unknown) => void,
  ) => Promise<PiAuthResult>;
  createPayment: (data: PiPaymentData, callbacks: PiPaymentCallbacks) => void;
};

type PiWindow = Window & { Pi?: PiSdkGlobal };

const SDK_SRC = "https://sdk.minepi.com/pi-sdk.js";

let sdkPromise: Promise<PiSdkGlobal> | null = null;
let initializedMode: "sandbox" | "mainnet" | null = null;

/** Detect whether the app is running inside the Pi Browser runtime. */
export function isPiBrowser(): boolean {
  if (typeof window === "undefined") return false;
  const w = window as PiWindow;
  if (w.Pi) return true;
  return /PiBrowser/i.test(w.navigator?.userAgent ?? "");
}

/**
 * Load the Pi SDK script once and return the global. In non-Pi-Browser
 * environments the script still loads successfully but `authenticate` /
 * `createPayment` will error inside the SDK.
 */
export function loadPiSdk(): Promise<PiSdkGlobal> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Pi SDK is browser-only."));
  }
  const w = window as PiWindow;
  if (w.Pi) return Promise.resolve(w.Pi);
  if (sdkPromise) return sdkPromise;
  sdkPromise = new Promise<PiSdkGlobal>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${SDK_SRC}"]`);
    const onReady = () => {
      const pi = (window as PiWindow).Pi;
      if (pi) resolve(pi);
      else reject(new Error("Pi SDK failed to initialize."));
    };
    if (existing) {
      if ((window as PiWindow).Pi) return onReady();
      existing.addEventListener("load", onReady, { once: true });
      existing.addEventListener("error", () => reject(new Error("Pi SDK failed to load.")), { once: true });
      return;
    }
    const s = document.createElement("script");
    s.src = SDK_SRC;
    s.async = true;
    s.onload = onReady;
    s.onerror = () => reject(new Error("Pi SDK failed to load."));
    document.head.appendChild(s);
  });
  return sdkPromise;
}

/** Initialize the SDK for a given network. Idempotent per-network. */
export async function initPiSdk(sandbox = true): Promise<PiSdkGlobal> {
  const pi = await loadPiSdk();
  const desired: "sandbox" | "mainnet" = sandbox ? "sandbox" : "mainnet";
  if (initializedMode !== desired) {
    pi.init({ version: "2.0", sandbox });
    initializedMode = desired;
  }
  return pi;
}

/**
 * Authenticate the current Pi Browser user. Returns UID, username and a
 * short-lived Pi Platform access token — verify the token on the server before
 * trusting the identity.
 */
export async function piAuthenticate(sandbox = true): Promise<PiUser> {
  if (!isPiBrowser()) {
    throw new Error("Open in the Pi Browser to sign in with Pi.");
  }
  const pi = await initPiSdk(sandbox);
  const res = await pi.authenticate(["username", "payments"], () => {
    /* incomplete-payment recovery hook — wire once Pi payments go live */
  });
  return { uid: res.user.uid, username: res.user.username, accessToken: res.accessToken };
}

/** Trigger a Pi payment flow. Requires an authenticated Pi Browser session. */
export async function piCreatePayment(
  data: PiPaymentData,
  cb: PiPaymentCallbacks,
  sandbox = true,
): Promise<void> {
  if (!isPiBrowser()) throw new Error("Open in the Pi Browser to pay with Pi.");
  const pi = await initPiSdk(sandbox);
  pi.createPayment(data, cb);
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
