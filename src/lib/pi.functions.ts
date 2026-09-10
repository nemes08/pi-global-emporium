import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * The Pi network (mainnet vs testnet) is a SERVER decision, read from the
 * PI_NETWORK secret. The client never chooses it and any value it sends is
 * ignored — this keeps production strictly on Mainnet.
 */
function serverUsesSandbox(): boolean {
  const raw = (process.env["PI_NETWORK"] ?? "mainnet").trim().toLowerCase();
  return raw === "testnet" || raw === "sandbox";
}

const TokenInput = z.object({
  accessToken: z.string().min(10).max(4000),
});

const UnlinkInput = z.object({});

type PiMeResponse = {
  uid: string;
  username: string;
};

/** Public, non-secret runtime configuration the Pi SDK needs in the browser. */
export const piNetworkConfig = createServerFn({ method: "GET" }).handler(async () => ({
  sandbox: serverUsesSandbox(),
  network: serverUsesSandbox() ? ("testnet" as const) : ("mainnet" as const),
}));

async function verifyPiAccessToken(accessToken: string): Promise<PiMeResponse> {
  const res = await fetch("https://api.minepi.com/v2/me", {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Accept": "application/json",
    },
  });

  if (!res.ok) {
    if (res.status === 401 || res.status === 403) {
      throw new Error("Pi sign-in could not be verified. Please try signing in again from the Pi Browser.");
    }
    throw new Error("Pi identity service is unavailable right now. Please try again in a moment.");
  }

  const me = (await res.json()) as PiMeResponse;
  if (!me?.uid || !me?.username) {
    throw new Error("Pi identity verification returned an unexpected response.");
  }
  return me;
}

async function derivePiPassword(uid: string): Promise<string> {
  const secret = process.env["PI_LOGIN_SECRET"];
  if (!secret) throw new Error("Pi sign-in is not configured on the server yet.");
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(uid));
  const hex = [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
  return `Pi!${hex}`;
}

export const piSignIn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => TokenInput.parse(input))
  .handler(async ({ data }) => {
    const me = await verifyPiAccessToken(data.accessToken);
    const sandbox = serverUsesSandbox();

    const url = process.env["SUPABASE_URL"];
    const anonKey = process.env["SUPABASE_PUBLISHABLE_KEY"];
    if (!url || !anonKey) {
      throw new Error("Backend configuration is incomplete on the server.");
    }

    // Deterministic, non-contactable internal identifier. No real email address
    // is ever collected: Pi UID is the only identity we store.
    const email = `pi-${me.uid}@pi.piglobalmarketplace.local`;
    const password = await derivePiPassword(me.uid);

    const client = createClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    let session = (await client.auth.signInWithPassword({ email, password })).data.session;

    if (!session) {
      const signUpRes = await client.auth.signUp({
        email,
        password,
        options: { data: { full_name: me.username, username: me.username, pi_native: true } },
      });
      if (signUpRes.error) throw new Error(signUpRes.error.message);
      session = signUpRes.data.session;
      if (!session) {
        const retry = await client.auth.signInWithPassword({ email, password });
        session = retry.data.session;
      }
      if (!session) {
        throw new Error("Your Pi account could not be opened. Please try again.");
      }
    }

    const authedClient = createClient(url, anonKey, {
      global: { headers: { Authorization: `Bearer ${session.access_token}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    await authedClient
      .from("profiles")
      .update({ pi_uid: me.uid, pi_username: me.username, pi_sandbox: sandbox })
      .eq("id", session.user.id);

    return {
      accessToken: session.access_token,
      refreshToken: session.refresh_token,
      username: me.username,
      sandbox,
    };
  });

export const linkPiIdentity = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => TokenInput.parse(input))
  .handler(async ({ data, context }) => {
    const me = await verifyPiAccessToken(data.accessToken);
    const sandbox = serverUsesSandbox();
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("profiles")
      .update({
        pi_uid: me.uid,
        pi_username: me.username,
        pi_sandbox: sandbox,
      })
      .eq("id", userId);

    if (error) throw new Error(error.message);
    return { uid: me.uid, username: me.username, sandbox };
  });

export const unlinkPiIdentity = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => UnlinkInput.parse(input ?? {}))
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("profiles")
      .update({ pi_uid: null, pi_username: null })
      .eq("id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
