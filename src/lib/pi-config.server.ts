/**
 * Production environment validation for the Pi Network integration.
 *
 * Every Pi server call goes through {@link requirePiConfig}, so a missing or
 * malformed secret fails loudly with an actionable message instead of sending
 * a half-configured request to Pi's Platform API.
 */

export type PiNetwork = "mainnet" | "testnet";

export type PiConfig = {
  apiKey: string;
  network: PiNetwork;
  horizonUrl: string;
  networkPassphrase: string;
  /** Present only when App-to-User payouts are configured. */
  walletSeed: string | null;
};

const HORIZON: Record<PiNetwork, string> = {
  mainnet: "https://api.mainnet.minepi.com",
  testnet: "https://api.testnet.minepi.com",
};

const PASSPHRASE: Record<PiNetwork, string> = {
  mainnet: "Pi Network",
  testnet: "Pi Testnet",
};

function resolveNetwork(): PiNetwork {
  const raw = (process.env["PI_NETWORK"] ?? "mainnet").trim().toLowerCase();
  if (raw === "testnet" || raw === "sandbox") return "testnet";
  if (raw === "mainnet" || raw === "production") return "mainnet";
  throw new Error(`Invalid PI_NETWORK value "${raw}". Use "mainnet" or "testnet".`);
}

/** Non-throwing readiness snapshot, safe to surface in the UI. */
export function piConfigStatus() {
  const apiKey = (process.env["PI_API_KEY"] ?? "").trim();
  const walletSeed = (process.env["PI_WALLET_PRIVATE_SEED"] ?? "").trim();
  let network: PiNetwork | null = null;
  let networkError: string | null = null;
  try {
    network = resolveNetwork();
  } catch (e) {
    networkError = (e as Error).message;
  }
  return {
    paymentsConfigured: apiKey.length >= 20,
    payoutsConfigured: walletSeed.startsWith("S") && walletSeed.length === 56,
    network,
    networkError,
  };
}

/**
 * Strict validation. `requireWallet` is true for App-to-User transfers, which
 * additionally need the app wallet's private seed to sign the blockchain
 * transaction.
 */
export function requirePiConfig(requireWallet = false): PiConfig {
  const apiKey = (process.env["PI_API_KEY"] ?? "").trim();
  if (!apiKey) {
    throw new Error("Pi payments are not configured: PI_API_KEY is missing.");
  }
  if (apiKey.length < 20) {
    throw new Error("PI_API_KEY looks invalid. Copy the Server API Key from the Pi Developer Portal.");
  }

  const network = resolveNetwork();
  const seedRaw = (process.env["PI_WALLET_PRIVATE_SEED"] ?? "").trim();
  let walletSeed: string | null = seedRaw || null;

  if (requireWallet) {
    if (!walletSeed) {
      throw new Error(
        "Pi payouts are not configured: PI_WALLET_PRIVATE_SEED is missing. Add the app wallet passphrase-derived secret seed from the Pi Developer Portal.",
      );
    }
    if (!walletSeed.startsWith("S") || walletSeed.length !== 56) {
      throw new Error("PI_WALLET_PRIVATE_SEED is malformed. It must be a 56-character seed starting with 'S'.");
    }
  }

  return {
    apiKey,
    network,
    horizonUrl: HORIZON[network],
    networkPassphrase: PASSPHRASE[network],
    walletSeed,
  };
}

/** Guard that the user's Pi wallet network matches the server network. */
export function assertNetworkMatch(config: PiConfig, userSandbox: boolean): void {
  const userNetwork: PiNetwork = userSandbox ? "testnet" : "mainnet";
  if (userNetwork !== config.network) {
    throw new Error(
      `Network mismatch: your Pi wallet is connected to ${userNetwork} but this marketplace runs on ${config.network}.`,
    );
  }
}
