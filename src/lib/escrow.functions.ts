import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const paymentInput = z.object({ escrowId: z.string().uuid(), paymentId: z.string().min(3).max(200) });
const completeInput = paymentInput.extend({ txId: z.string().min(3).max(200) });
const recoveryInput = z.object({ paymentId: z.string().min(3).max(200), escrowId: z.string().uuid(), txId: z.string().min(3).max(200).optional() });

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
