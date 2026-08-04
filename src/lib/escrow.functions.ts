import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { completeInput, paymentInput, recoveryInput } from "@/lib/escrow.schemas";

export const approvePiPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => paymentInput.parse(input))
  .handler(async ({ data, context }) => {
    const { approvePayment } = await import("@/lib/pi-payment.server");
    return approvePayment(data, context);
  });

/**
 * Fund an escrow after a Pi payment.
 *
 * Security model:
 *  - the caller must be the escrow's buyer (checked with the user's own RLS client);
 *  - when a Pi Platform API key is configured, the payment is verified server-side
 *    against Pi's API and the amount must match the escrow amount;
 *  - only after those checks does the privileged client mark the escrow funded.
 */
export const fundEscrowWithPi = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => completeInput.parse(input))
  .handler(async ({ data, context }) => {
    const { completePayment } = await import("@/lib/pi-payment.server");
    return completePayment(data, context);
  });

export const recoverIncompletePiPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => recoveryInput.parse(input))
  .handler(async ({ data, context }) => {
    const { recoverPayment } = await import("@/lib/pi-payment.server");
    return recoverPayment(data, context);
  });
