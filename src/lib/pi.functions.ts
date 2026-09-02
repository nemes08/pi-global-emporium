import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
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

async function derivePiPassword(uid: string): Promise<string> {
  const secret = process.env.PI_LOGIN_SECRET;
  if (!secret) throw new Error("Missing PI_LOGIN_SECRET on the server.");
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
  .inputValidator((input: unknown) => SignInInput.parse(input))
  .handler(async ({ data }) => {
    const me = await verifyPiAccessToken(data.accessToken);

    const url = process.env.SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL;
    const anonKey = process.env.SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    if (!url || !anonKey) {
      throw new Error("Missing SUPABASE_URL or SUPABASE_PUBLISHABLE_KEY on the server.");
    }

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
        throw new Error(
          "Pi Wallet sign-in needs 'Confirm email' turned OFF for the Email provider in Supabase Auth settings.",
        );
      }
    }

    const authedClient = createClient(url, anonKey, {
      global: { headers: { Authorization: `Bearer ${session.access_token}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    await authedClient
      .from("profiles")
      .update({ pi_uid: me.uid, pi_username: me.username, pi_sandbox: data.sandbox })
      .eq("id", session.user.id);

    return {
      accessToken: session.access_token,
      refreshToken: session.refresh_token,
      username: me.username,
    };
  });

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
