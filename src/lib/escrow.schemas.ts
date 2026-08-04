import { z } from "zod";

export const paymentInput = z.object({ escrowId: z.string().uuid(), paymentId: z.string().min(3).max(200) });
export const completeInput = paymentInput.extend({ txId: z.string().min(3).max(200) });
export const recoveryInput = z.object({ paymentId: z.string().min(3).max(200), escrowId: z.string().uuid(), txId: z.string().min(3).max(200).optional() });