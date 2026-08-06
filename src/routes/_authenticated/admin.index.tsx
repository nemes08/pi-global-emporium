import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { fetchAdminCounts, fetchRevenue, PLATFORM_FEE_RATE } from "@/lib/admin";
import { usePricing } from "@/lib/pricing";
import { PiPayoutsPanel } from "@/components/admin/PiPayoutsPanel";

export const Route = createFileRoute("/_authenticated/admin/")({
  head: () => ({
    meta: [
      { title: "Admin Overview · Pi Global Marketplace" },
      { name: "description", content: "Platform statistics, revenue and escrow volume for Pi Global Marketplace operators." },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "Admin Overview · Pi Global Marketplace" },
      { property: "og:description", content: "Platform statistics, revenue and escrow volume." },
    ],
  }),
  component: AdminOverview,
});

function AdminOverview() {
  const { usdPerPi } = usePricing();
  const { data: counts, isPending } = useQuery({ queryKey: ["admin-counts"], queryFn: fetchAdminCounts });
  const { data: revenue } = useQuery({ queryKey: ["admin-revenue"], queryFn: fetchRevenue });

  const pi = (usd: number) => `${(usd / usdPerPi).toLocaleString(undefined, { maximumFractionDigits: 4 })} π`;

  return (
    <div>
      <h1 className="mb-6 font-display text-3xl text-gradient-gold sm:text-4xl">Platform Overview</h1>

      {isPending ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-busy="true">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="glass h-24 animate-pulse rounded-2xl border border-white/10" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Users" value={counts?.users ?? 0} />
          <Stat label="Listings" value={counts?.listings ?? 0} />
          <Stat label="Orders" value={counts?.orders ?? 0} />
          <Stat label="Escrows" value={counts?.escrows ?? 0} />
          <Stat label="Pending approvals" value={counts?.pendingListings ?? 0} tone="amber" />
          <Stat label="Verification queue" value={counts?.pendingVerifications ?? 0} tone="amber" />
          <Stat label="Open disputes" value={counts?.openDisputes ?? 0} tone="red" />
          <Stat label="Open reports" value={counts?.openReports ?? 0} tone="red" />
        </div>
      )}

      <h2 className="mt-10 mb-4 font-display text-2xl text-silver">Revenue dashboard</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Gross escrow volume" value={`$${(revenue?.grossUsd ?? 0).toLocaleString()}`} sub={pi(revenue?.grossUsd ?? 0)} />
        <Stat label="Released to sellers" value={`$${(revenue?.releasedUsd ?? 0).toLocaleString()}`} sub={pi(revenue?.releasedUsd ?? 0)} />
        <Stat label="Currently in escrow" value={`$${(revenue?.inEscrowUsd ?? 0).toLocaleString()}`} sub={pi(revenue?.inEscrowUsd ?? 0)} />
        <Stat
          label={`Platform fee (${(PLATFORM_FEE_RATE * 100).toFixed(0)}%)`}
          value={`$${(revenue?.feeUsd ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`}
          sub={pi(revenue?.feeUsd ?? 0)}
        />
      </div>

      <h2 className="mt-10 mb-4 font-display text-2xl text-silver">Released volume by month</h2>
      {!revenue || revenue.byMonth.length === 0 ? (
        <p className="glass rounded-2xl border border-white/10 p-6 text-sm text-silver/60">
          No released escrow volume yet — figures appear as transactions complete.
        </p>
      ) : (
        <ul className="glass space-y-2 rounded-2xl border border-white/10 p-5">
          {revenue.byMonth.map((m) => {
            const max = Math.max(...revenue.byMonth.map((x) => x.usd)) || 1;
            return (
              <li key={m.month} className="flex items-center gap-3 text-xs">
                <span className="w-20 text-silver/60">{m.month}</span>
                <span className="h-2 flex-1 overflow-hidden rounded-full bg-white/5">
                  <span className="block h-full rounded-full bg-gradient-to-r from-gold/70 to-gold" style={{ width: `${(m.usd / max) * 100}%` }} />
                </span>
                <span className="w-28 text-right text-silver">${m.usd.toLocaleString()}</span>
              </li>
            );
          })}
        </ul>
      )}

      <PiPayoutsPanel />

      <p className="mt-6 text-[11px] text-silver/50">
        Pi figures use the Community GCV Reference (1 Pi = 314,159 USD), a community ecosystem reference and NOT an
        official Pi Network exchange rate.
      </p>
    </div>
  );
}

function Stat({
  label,
  value,
  sub,
  tone = "gold",
}: {
  label: string;
  value: number | string;
  sub?: string;
  tone?: "gold" | "amber" | "red";
}) {
  const toneCls =
    tone === "red" ? "text-red-300" : tone === "amber" ? "text-amber-300" : "text-gradient-gold";
  return (
    <div className="glass rounded-2xl border border-white/10 p-4">
      <p className="text-[10px] uppercase tracking-widest text-silver/50">{label}</p>
      <p className={`mt-1 font-display text-2xl ${toneCls}`}>{value}</p>
      {sub && <p className="text-[10px] text-silver/50">{sub}</p>}
    </div>
  );
}
