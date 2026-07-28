import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const LinkInput = z.object({
  accessToken: z.string().min(10).max(4000),
  sandbox: z.boolean().default(true),
});

const UnlinkInput = z.object({});

type PiMeResponse = {
  uid: string;
  username: string;
};

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
    const res = await fetch("https://api.minepi.com/v2/me", {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${data.accessToken}`,
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
