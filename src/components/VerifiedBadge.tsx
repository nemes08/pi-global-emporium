export function VerifiedBadge({ compact = false }: { compact?: boolean }) {
  return (
    <span
      title="Verified seller"
      className={`inline-flex items-center gap-1 rounded-full bg-gold/90 font-semibold uppercase tracking-widest text-onyx ${
        compact ? "px-2 py-0.5 text-[9px]" : "px-2.5 py-1 text-[10px]"
      }`}
    >
      ✓ Verified
    </span>
  );
}
