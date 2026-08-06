import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const escrowPayout = z.object({ escrowId: z.string().uuid() });
const payoutId = z.object({ payoutId: z.string().uuid() });

/** Real Pi blockchain payout to the seller (escrow release). */
export const releaseEscrowToSeller = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => escrowPayout.parse(input))
  .handler(async ({ data, context }) => {
    const { payoutEscrow } = await import("@/lib/pi-payout.server");
    return payoutEscrow(context, { escrowId: data.escrowId, kind: "release" });
  });

/** Real Pi blockchain refund back to the buyer. */
export const refundEscrowToBuyer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => escrowPayout.parse(input))
  .handler(async ({ data, context }) => {
    const { payoutEscrow } = await import("@/lib/pi-payout.server");
    return payoutEscrow(context, { escrowId: data.escrowId, kind: "refund" });
  });

/** Cancel a reserved payout that can no longer settle (admin only). */
export const cancelPiPayout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => payoutId.parse(input))
  .handler(async ({ data, context }) => {
    const { cancelPayout } = await import("@/lib/pi-payout.server");
    return cancelPayout(context, data);
  });

/** Sweep and settle every payout Pi still considers open (admin only). */
export const recoverPiPayouts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({}).parse(input ?? {}))
  .handler(async ({ context }) => {
    const { recoverPayouts } = await import("@/lib/pi-payout.server");
    return recoverPayouts(context);
  });

/** Non-sensitive readiness snapshot for the Pi integration. */
export const piIntegrationStatus = createServerFn({ method: "GET" }).handler(async () => {
  const { piConfigStatus } = await import("@/lib/pi-config.server");
  return piConfigStatus();
});
