import { supabase } from "@/integrations/supabase/client";

export type AdminCounts = {
  users: number;
  listings: number;
  pendingListings: number;
  orders: number;
  escrows: number;
  openDisputes: number;
  openReports: number;
  pendingVerifications: number;
  reviews: number;
};

export type AdminUserRow = {
  id: string;
  full_name: string | null;
  username: string | null;
  country: string | null;
  city: string | null;
  verified: boolean;
  dealer_tier: string;
  pi_username: string | null;
  join_date: string;
};

export type AdminListingRow = {
  id: string;
  seller_id: string;
  title: string;
  category: string;
  price_usd: number;
  status: string;
  moderation_status: "pending" | "approved" | "rejected";
  moderation_note: string | null;
  created_at: string;
};

export type ReportRow = {
  id: string;
  reporter_id: string;
  target_type: string;
  target_id: string;
  reason: string;
  details: string | null;
  status: "open" | "reviewing" | "actioned" | "dismissed";
  created_at: string;
};

export type ActivityLogRow = {
  id: string;
  actor_id: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  meta: unknown;
  created_at: string;
};

export async function isAdminUser(userId: string | undefined): Promise<boolean> {
  if (!userId) return false;
  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  return !!data;
}

async function countOf(
  table: "profiles" | "listings" | "orders" | "escrows" | "reviews",
  apply?: (q: ReturnType<typeof buildCount>) => ReturnType<typeof buildCount>,
): Promise<number> {
  let q = buildCount(table);
  if (apply) q = apply(q);
  const { count } = await q;
  return count ?? 0;
}

function buildCount(table: string) {
  return supabase.from(table as never).select("*", { count: "exact", head: true });
}

export async function fetchAdminCounts(): Promise<AdminCounts> {
  const [users, listings, orders, escrows, reviews] = await Promise.all([
    countOf("profiles"),
    countOf("listings"),
    countOf("orders"),
    countOf("escrows"),
    countOf("reviews"),
  ]);
  const [pending, disputes, reports, verifications] = await Promise.all([
    buildCount("listings").eq("moderation_status", "pending"),
    buildCount("disputes").in("status", ["open", "under_review"]),
    buildCount("reports").in("status", ["open", "reviewing"]),
    buildCount("verification_requests").eq("status", "pending"),
  ]);
  return {
    users,
    listings,
    orders,
    escrows,
    reviews,
    pendingListings: pending.count ?? 0,
    openDisputes: disputes.count ?? 0,
    openReports: reports.count ?? 0,
    pendingVerifications: verifications.count ?? 0,
  };
}

export type RevenueSummary = {
  grossUsd: number;
  releasedUsd: number;
  inEscrowUsd: number;
  refundedUsd: number;
  feeUsd: number;
  byMonth: { month: string; usd: number }[];
};

/** Platform commission used for the revenue dashboard (3% of released volume). */
export const PLATFORM_FEE_RATE = 0.03;

export async function fetchRevenue(): Promise<RevenueSummary> {
  const { data } = await supabase
    .from("escrows")
    .select("amount_usd, status, created_at, released_at")
    .order("created_at", { ascending: true });
  const rows = data ?? [];
  let released = 0;
  let inEscrow = 0;
  let refunded = 0;
  let gross = 0;
  const months = new Map<string, number>();
  for (const r of rows) {
    const amt = Number(r.amount_usd) || 0;
    gross += amt;
    if (r.status === "released") {
      released += amt;
      const key = (r.released_at ?? r.created_at).slice(0, 7);
      months.set(key, (months.get(key) ?? 0) + amt);
    } else if (r.status === "refunded") refunded += amt;
    else if (["funded", "shipped", "delivered", "disputed"].includes(r.status as string)) inEscrow += amt;
  }
  return {
    grossUsd: gross,
    releasedUsd: released,
    inEscrowUsd: inEscrow,
    refundedUsd: refunded,
    feeUsd: released * PLATFORM_FEE_RATE,
    byMonth: [...months.entries()].map(([month, usd]) => ({ month, usd })),
  };
}

export async function logAdminAction(input: {
  actorId: string;
  action: string;
  entityType?: string;
  entityId?: string;
  meta?: Record<string, unknown>;
}) {
  await supabase.from("activity_logs").insert({
    actor_id: input.actorId,
    action: input.action,
    entity_type: input.entityType ?? null,
    entity_id: input.entityId ?? null,
    meta: (input.meta ?? null) as never,
  });
}
