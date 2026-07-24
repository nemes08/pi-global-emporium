import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AccountLayout } from "@/components/AccountLayout";
import { usePricing } from "@/lib/pricing";
import { signMediaUrl, type ListingRow } from "@/lib/listings";

export const Route = createFileRoute("/_authenticated/recently-viewed")({
  head: () => ({
    meta: [
      { title: "Recently Viewed · Pi Global Marketplace" },
      { name: "description", content: "Continue where you left off — recently viewed listings on Pi Global Marketplace." },
      { property: "og:title", content: "Recently Viewed · Pi Global Marketplace" },
      { property: "og:description", content: "Continue where you left off." },
    ],
  }),
  component: RecentPage,
});

function RecentPage() {
  const { usdPerPi } = usePricing();
  const { data, isLoading } = useQuery({
    queryKey: ["recently-viewed"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return [];
      const { data } = await supabase
        .from("recently_viewed")
        .select("viewed_at, listings(*)")
        .eq("user_id", u.user.id)
        .order("viewed_at", { ascending: false })
        .limit(60);
      return (data ?? []).map((r: { listings: ListingRow | null }) => r.listings).filter(Boolean) as ListingRow[];
    },
  });

  return (
    <AccountLayout title="Recently Viewed">
      {isLoading ? (
        <div className="text-sm text-silver/60">Loading…</div>
      ) : !data || data.length === 0 ? (
        <div className="glass rounded-2xl p-10 text-center border border-white/10">
          <div className="text-4xl">◔</div>
          <p className="text-sm text-silver/70 mt-2">Nothing here yet — browse listings to build history.</p>
          <Link to="/marketplace" className="mt-4 inline-flex btn-gold rounded-full px-5 py-2 text-sm">Explore marketplace</Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {data.map((l) => <RvCard key={l.id} l={l} usdPerPi={usdPerPi} />)}
        </div>
      )}
    </AccountLayout>
  );
}

function RvCard({ l, usdPerPi }: { l: ListingRow; usdPerPi: number }) {
  const [cover, setCover] = useState<string | null>(null);
  useEffect(() => { signMediaUrl(l.cover_image).then(setCover); }, [l.cover_image]);
  const pi = l.price_usd / usdPerPi;
  return (
    <Link to="/listing/$id" params={{ id: l.id }} className="glass rounded-2xl overflow-hidden border border-white/10 hover:border-gold/30 transition">
      <div className="relative aspect-[16/10] bg-black/40 overflow-hidden">
        {cover ? <img src={cover} alt={l.title} className="h-full w-full object-cover" /> : <div className="h-full w-full grid place-items-center text-3xl text-silver/40">🖼️</div>}
      </div>
      <div className="p-4">
        <h3 className="font-display text-lg truncate">{l.title}</h3>
        <p className="text-xs text-silver/60">{l.city || "—"}{l.country ? `, ${l.country}` : ""}</p>
        <div className="mt-2 flex items-baseline justify-between">
          <span className="font-display text-xl text-gradient-gold">{pi.toLocaleString(undefined, { maximumFractionDigits: 5 })} π</span>
          <span className="text-xs text-silver/60">${l.price_usd.toLocaleString()}</span>
        </div>
      </div>
    </Link>
  );
}
