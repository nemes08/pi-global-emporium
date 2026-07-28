import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AccountLayout } from "@/components/AccountLayout";
import { PiConnectCard } from "@/components/PiConnectCard";
import { GCV_USD_PER_PI, usePricing } from "@/lib/pricing";

export const Route = createFileRoute("/_authenticated/wallet")({
  head: () => ({
    meta: [
      { title: "Wallet · Pi Global Marketplace" },
      { name: "description", content: "Pi Wallet overview, balance and marketplace activity on Pi Global Marketplace." },
      { property: "og:title", content: "Wallet · Pi Global Marketplace" },
      { property: "og:description", content: "Pi Wallet overview and balance." },
    ],
  }),
  component: WalletPage,
});

function WalletPage() {
  const { usdPerPi, mode } = usePricing();
  const { data } = useQuery({
    queryKey: ["wallet-activity"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return null;
      const [purchases, sales] = await Promise.all([
        supabase.from("orders").select("price_usd,status,created_at").eq("buyer_id", u.user.id),
        supabase.from("orders").select("price_usd,status,created_at").eq("seller_id", u.user.id),
      ]);
      const spent = (purchases.data ?? []).filter((o) => ["paid", "shipped", "completed"].includes(o.status)).reduce((s, o) => s + Number(o.price_usd), 0);
      const earned = (sales.data ?? []).filter((o) => ["paid", "shipped", "completed"].includes(o.status)).reduce((s, o) => s + Number(o.price_usd), 0);
      return { spent, earned, netUsd: earned - spent };
    },
  });

  return (
    <AccountLayout title="Wallet Overview">
      <div className="grid gap-4 md:grid-cols-2">
        <PiConnectCard />

        <div className="glass-strong rounded-3xl p-6 border border-gold/30 relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none opacity-20 bg-gradient-to-br from-gold/40 via-transparent to-transparent" />
          <div className="relative">
            <p className="text-xs uppercase tracking-widest text-gold">Balance</p>
            <p className="font-display text-4xl text-gradient-gold mt-2">— π</p>
            <p className="mt-1 text-xs text-silver/60">Live balance activates once the Pi Wallet is connected in the Pi Browser.</p>
            <p className="mt-4 text-[10px] text-silver/50">
              Rate: 1 π = ${usdPerPi.toLocaleString()} USD ({mode === "gcv" ? "GCV community reference" : "Exchange market value"})
            </p>
          </div>
        </div>

        <div className="glass rounded-2xl p-6 border border-white/10 md:col-span-2">
          <p className="text-xs uppercase tracking-widest text-silver/60">Marketplace activity</p>
          <ul className="mt-3 space-y-3 text-sm">
            <Row label="Total spent" value={`$${(data?.spent ?? 0).toLocaleString()}`} sub={`${((data?.spent ?? 0) / usdPerPi).toLocaleString(undefined, { maximumFractionDigits: 5 })} π`} />
            <Row label="Total earned" value={`$${(data?.earned ?? 0).toLocaleString()}`} sub={`${((data?.earned ?? 0) / usdPerPi).toLocaleString(undefined, { maximumFractionDigits: 5 })} π`} />
            <Row label="Net" value={`$${(data?.netUsd ?? 0).toLocaleString()}`} sub={`${((data?.netUsd ?? 0) / usdPerPi).toLocaleString(undefined, { maximumFractionDigits: 5 })} π`} />
          </ul>
          <div className="mt-4 flex gap-2">
            <Link to="/orders" className="btn-ghost-silver rounded-full px-4 py-1.5 text-xs">View orders</Link>
            <Link to="/offers" className="btn-ghost-silver rounded-full px-4 py-1.5 text-xs">View offers</Link>
          </div>
        </div>
      </div>

      <div className="mt-6 glass rounded-2xl p-5 border border-white/10 text-[10px] leading-relaxed text-silver/60">
        Community GCV Reference (1 π = {GCV_USD_PER_PI.toLocaleString()} USD) is a community ecosystem reference and is NOT an official Pi Network exchange rate.
        On-chain Pi payments and balances become active inside Pi Browser once Pi SDK integration is enabled.
      </div>
    </AccountLayout>
  );
}

function Row({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <li className="flex items-baseline justify-between">
      <span className="text-silver/70">{label}</span>
      <span className="text-right">
        <span className="text-white">{value}</span>
        {sub && <span className="ml-2 text-xs text-gold">{sub}</span>}
      </span>
    </li>
  );
}
