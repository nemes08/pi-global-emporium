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
 * Flow:
 * 1. Verify the Pi access token server-side via /v2/me (never trust the client).
 * 2. Look up a profile already linked to this pi_uid.
 *    - Found  -> reuse that Supabase auth user.
 *    - Not found -> create a new Supabase auth user with a synthetic,
 *      unguessable @pi.local email (the user never sees or uses this email;
 *      it exists only because Supabase Auth requires an identifier). The
 *      `handle_new_user` trigger creates the matching profiles row, which we
 *      then stamp with pi_uid / pi_username via the service-role client.
 * 3. Mint a one-time magic-link token via the Admin API and return its
 *    token_hash to the client. The client calls `supabase.auth.verifyOtp`
 *    with it to establish a real session — no email is ever sent.
 *
 * IMPORTANT: this file is a `*.functions.ts` file and ships to the client
 * bundle, so the service-role client is imported dynamically inside the
 * handler (server-only) rather than at module scope.
 */
export const piSignIn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => SignInInput.parse(input))
  .handler(async ({ data }) => {
    const me = await verifyPiAccessToken(data.accessToken);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: existing, error: lookupError } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("pi_uid", me.uid)
      .maybeSingle();
    if (lookupError) throw new Error(lookupError.message);

    let userId: string;
    let email: string;

    if (existing?.id) {
      userId = existing.id;
      const { data: userRes, error: getUserError } = await supabaseAdmin.auth.admin.getUserById(userId);
      if (getUserError || !userRes?.user?.email) {
        throw new Error("Could not resolve the linked account for this Pi Wallet.");
      }
      email = userRes.user.email;

      // Keep the sandbox/mainnet flag and username fresh on every sign-in.
      await supabaseAdmin
        .from("profiles")
        .update({ pi_username: me.username, pi_sandbox: data.sandbox })
        .eq("id", userId);
    } else {
      // Synthetic, unguessable email — never displayed or emailed to anyone.
      email = `pi-${me.uid}@pi.piglobalmarketplace.local`;
      const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        email_confirm: true,
        user_metadata: { full_name: me.username, username: me.username, pi_native: true },
      });
      if (createError || !created?.user) {
        throw new Error(createError?.message ?? "Could not create a Pi Wallet account.");
      }
      userId = created.user.id;

      // handle_new_user's trigger creates the profiles row asynchronously
      // within the same transaction; stamp the Pi identity onto it now.
      const { error: stampError } = await supabaseAdmin
        .from("profiles")
        .update({ pi_uid: me.uid, pi_username: me.username, pi_sandbox: data.sandbox })
        .eq("id", userId);
      if (stampError) throw new Error(stampError.message);
    }

    const { data: link, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: "magiclink",
      email,
    });
    if (linkError || !link?.properties?.hashed_token) {
      throw new Error(linkError?.message ?? "Could not start a Pi Wallet session.");
    }

    return {
      tokenHash: link.properties.hashed_token,
      username: me.username,
    };
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
