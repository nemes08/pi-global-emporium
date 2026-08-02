import { supabase } from "@/integrations/supabase/client";

export type EscrowStatus =
  | "awaiting_payment"
  | "funded"
  | "shipped"
  | "delivered"
  | "released"
  | "refunded"
  | "disputed"
  | "cancelled";

export type EscrowRow = {
  id: string;
  order_id: string;
  buyer_id: string;
  seller_id: string;
  amount_usd: number;
  status: EscrowStatus;
  pi_payment_id: string | null;
  pi_tx_id: string | null;
  funded_at: string | null;
  shipped_at: string | null;
  delivered_at: string | null;
  released_at: string | null;
  refunded_at: string | null;
  created_at: string;
  updated_at: string;
};

export type EscrowEventRow = {
  id: string;
  escrow_id: string;
  status: EscrowStatus;
  actor_id: string | null;
  note: string | null;
  created_at: string;
};

export type DisputeRow = {
  id: string;
  order_id: string;
  escrow_id: string | null;
  opened_by: string;
  buyer_id: string;
  seller_id: string;
  reason: string;
  details: string | null;
  status: "open" | "under_review" | "resolved_buyer" | "resolved_seller" | "closed";
  resolution: string | null;
  created_at: string;
};

export type EscrowWithOrder = EscrowRow & {
  orders: { id: string; listing_id: string; status: string; notes: string | null; listings: { title: string | null } | null } | null;
};

export const ESCROW_LABEL: Record<EscrowStatus, string> = {
  awaiting_payment: "Awaiting Pi payment",
  funded: "Funded in escrow",
  shipped: "Shipped by seller",
  delivered: "Delivered",
  released: "Pi released to seller",
  refunded: "Refunded to buyer",
  disputed: "In dispute",
  cancelled: "Cancelled",
};

export const ESCROW_TONE: Record<EscrowStatus, string> = {
  awaiting_payment: "bg-white/5 text-silver/70 border-white/15",
  funded: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  shipped: "bg-sky-500/15 text-sky-300 border-sky-500/30",
  delivered: "bg-indigo-500/15 text-indigo-200 border-indigo-500/30",
  released: "bg-gold/20 text-gold border-gold/40",
  refunded: "bg-amber-500/15 text-amber-200 border-amber-500/30",
  disputed: "bg-red-500/15 text-red-300 border-red-500/30",
  cancelled: "bg-neutral-500/15 text-neutral-300 border-neutral-500/30",
};

/** Canonical happy-path escrow timeline. */
export const ESCROW_FLOW: EscrowStatus[] = [
  "awaiting_payment",
  "funded",
  "shipped",
  "delivered",
  "released",
];

export function flowIndex(status: EscrowStatus): number {
  const i = ESCROW_FLOW.indexOf(status);
  return i === -1 ? ESCROW_FLOW.length : i;
}

const SELECT_WITH_ORDER =
  "*, orders(id, listing_id, status, notes, listings(title))";

export async function fetchMyEscrows(
  userId: string,
  role: "buyer" | "seller",
): Promise<EscrowWithOrder[]> {
  const col = role === "buyer" ? "buyer_id" : "seller_id";
  const { data, error } = await supabase
    .from("escrows")
    .select(SELECT_WITH_ORDER)
    .eq(col, userId)
    .order("created_at", { ascending: false });
  if (error) return [];
  return (data ?? []) as unknown as EscrowWithOrder[];
}

export async function fetchEscrowEvents(escrowId: string): Promise<EscrowEventRow[]> {
  const { data } = await supabase
    .from("escrow_events")
    .select("*")
    .eq("escrow_id", escrowId)
    .order("created_at", { ascending: true });
  return (data ?? []) as EscrowEventRow[];
}

export async function fetchMyDisputes(userId: string): Promise<DisputeRow[]> {
  const { data } = await supabase
    .from("disputes")
    .select("*")
    .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
    .order("created_at", { ascending: false });
  return (data ?? []) as DisputeRow[];
}

export async function setEscrowStatus(id: string, status: EscrowStatus): Promise<string | null> {
  const { error } = await supabase.from("escrows").update({ status }).eq("id", id);
  return error?.message ?? null;
}

export async function openDispute(input: {
  escrow: EscrowRow;
  openedBy: string;
  reason: string;
  details?: string;
}): Promise<string | null> {
  const { error } = await supabase.from("disputes").insert({
    order_id: input.escrow.order_id,
    escrow_id: input.escrow.id,
    opened_by: input.openedBy,
    buyer_id: input.escrow.buyer_id,
    seller_id: input.escrow.seller_id,
    reason: input.reason,
    details: input.details?.trim() || null,
  });
  if (error) return error.message;
  return setEscrowStatus(input.escrow.id, "disputed");
}
