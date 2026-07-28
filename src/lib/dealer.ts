export type DealerTier = "none" | "verified" | "gold" | "premium";

export const DEALER_TIER_LABEL: Record<DealerTier, string> = {
  none: "Standard seller",
  verified: "Verified dealer",
  gold: "Gold dealer",
  premium: "Premium dealer",
};

export const DEALER_TIER_ORDER: Record<DealerTier, number> = {
  none: 0,
  verified: 1,
  gold: 2,
  premium: 3,
};

/** Normalize an unknown value coming from the database. */
export function normalizeTier(v: unknown): DealerTier {
  if (v === "verified" || v === "gold" || v === "premium") return v;
  return "none";
}
