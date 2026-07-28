import { DEALER_TIER_LABEL, normalizeTier, type DealerTier } from "@/lib/dealer";

type Variant = "compact" | "regular" | "large";

/**
 * Premium dealer tier badge (Verified / Gold / Premium).
 * Falls back to the plain Verified badge for legacy `verified=true` profiles
 * whose `dealer_tier` has not been assigned yet.
 */
export function DealerBadge({
  tier,
  verified,
  variant = "regular",
  className = "",
}: {
  tier: DealerTier | string | null | undefined;
  verified?: boolean;
  variant?: Variant;
  className?: string;
}) {
  const t: DealerTier = tier ? normalizeTier(tier) : verified ? "verified" : "none";
  if (t === "none") return null;

  const size =
    variant === "compact" ? "px-2 py-0.5 text-[9px]" :
    variant === "large" ? "px-3 py-1.5 text-[11px]" :
    "px-2.5 py-1 text-[10px]";

  const styles: Record<Exclude<DealerTier, "none">, { classes: string; icon: string; label: string }> = {
    verified: {
      classes: "bg-gold/90 text-onyx",
      icon: "✓",
      label: "Verified",
    },
    gold: {
      classes: "bg-gradient-to-r from-yellow-300 via-gold to-amber-500 text-onyx shadow-[0_0_0_1px_rgba(255,215,0,0.4),0_0_12px_-2px_rgba(255,215,0,0.6)]",
      icon: "★",
      label: "Gold",
    },
    premium: {
      classes: "bg-gradient-to-r from-amber-200 via-gold to-orange-400 text-onyx shadow-[0_0_0_1px_rgba(255,215,0,0.6),0_0_16px_-2px_rgba(255,190,80,0.75)]",
      icon: "◆",
      label: "Premium",
    },
  };

  const s = styles[t];
  return (
    <span
      title={DEALER_TIER_LABEL[t]}
      className={`inline-flex items-center gap-1 rounded-full font-semibold uppercase tracking-widest ${size} ${s.classes} ${className}`}
    >
      <span aria-hidden>{s.icon}</span>
      {s.label}
    </span>
  );
}
