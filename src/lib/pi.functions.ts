import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const LinkInput = z.object({
  accessToken: z.string().min(10).max(4000),
  sandbox: z.boolean().default(true),
});

const UnlinkInput = z.object({});

const SignInInput = z.object({
  accessToken: z.string().min(10).max(4000),
  sandbox: z.boolean().default(true),
});

type PiMeResponse = {
  uid: string;
  username: string;
};

/**
 * Verify a Pi Platform access token against Pi's `/v2/me` endpoint. Shared by
 * both the sign-in flow (below) and the link/unlink flow. Never trust a
 * client-supplied uid/username directly.
 */
async function verifyPiAccessToken(accessToken: string): Promise<PiMeResponse> {
  const res = await fetch("https://api.minepi.com/v2/me", {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Accept": "application/json",
    },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Pi identity verification failed (${res.status}): ${body.slice(0, 160)}`);
  }

  const me = (await res.json()) as PiMeResponse;
  if (!me?.uid || !me?.username) {
    throw new Error("Pi identity verification returned an unexpected payload.");
  }
  return me;
}

/**
 * Sign in (or silently register) with a Pi Wallet — no email/password needed.
 *
 * This delegates to the `pi-sign-in` Supabase Edge Function, which runs
 * inside Supabase's own infrastructure and has the service-role key injected
 * automatically. Cloudflare only ever needs the public anon key (already
 * configured) to call it — the service-role key never has to be copied
 * anywhere.
 */
export const piSignIn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => SignInInput.parse(input))
  .handler(async ({ data }) => {
    const url = process.env.SUPABASE_URL;
    const anonKey = process.env.SUPABASE_PUBLISHABLE_KEY;
    if (!url || !anonKey) {
      throw new Error("Missing SUPABASE_URL or SUPABASE_PUBLISHABLE_KEY on the server.");
    }

    const res = await fetch(`${url}/functions/v1/pi-sign-in`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${anonKey}`,
        "apikey": anonKey,
      },
      body: JSON.stringify({ accessToken: data.accessToken, sandbox: data.sandbox }),
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok || json.error) {
      throw new Error(json.error ?? `Pi sign-in failed (${res.status}).`);
    }
    return { tokenHash: json.tokenHash as string, username: json.username as string };
  });

/**
 * Verify a Pi Platform access token by calling `/v2/me` on Pi's API, then link
 * the resulting Pi UID + username to the authenticated user's profile.
 *
 * Never trust the client-supplied UID/username directly — always resolve them
 * through Pi's server so a malicious client cannot claim another Pi account.
 */
export const linkPiIdentity = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => LinkInput.parse(input))
  .handler(async ({ data, context }) => {
    const me = await verifyPiAccessToken(data.accessToken);
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("profiles")
      .update({
        pi_uid: me.uid,
        pi_username: me.username,
        pi_sandbox: data.sandbox,
      })
      .eq("id", userId);

    if (error) throw new Error(error.message);
    return { uid: me.uid, username: me.username, sandbox: data.sandbox };
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
