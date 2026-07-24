import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AccountLayout } from "@/components/AccountLayout";
import { usePricing } from "@/lib/pricing";
import { CATEGORY_LABELS, type CategoryKey } from "@/lib/catalog";

export const Route = createFileRoute("/_authenticated/analytics")({
  head: () => ({
    meta: [
      { title: "Analytics · Pi Global Marketplace" },
      { name: "description", content: "Track listing performance, views and revenue on Pi Global Marketplace." },
      { property: "og:title", content: "Analytics · Pi Global Marketplace" },
      { property: "og:description", content: "Track performance, views and revenue." },
    ],
  }),
  component: AnalyticsPage,
});

function AnalyticsPage() {
  const { usdPerPi } = usePricing();
  const { data, isLoading } = useQuery({
    queryKey: ["analytics"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return null;
      const [listRes, orderRes, offerRes, favRes] = await Promise.all([
        supabase.from("listings").select("id,title,category,status,views_count,price_usd,created_at").eq("seller_id", u.user.id),
        supabase.from("orders").select("price_usd,status,created_at").eq("seller_id", u.user.id),
        supabase.from("offers").select("id,status").eq("seller_id", u.user.id),
        supabase.from("favorites").select("listing_id", { count: "exact", head: true }).in("listing_id", []),
      ]);
      const listings = listRes.data ?? [];
      const orders = orderRes.data ?? [];
      const offers = offerRes.data ?? [];
      const listingIds = listings.map((l) => l.id);
      let totalFavorites = 0;
      if (listingIds.length) {
        const { count } = await supabase.from("favorites").select("listing_id", { count: "exact", head: true }).in("listing_id", listingIds);
        totalFavorites = count ?? 0;
      }
      const revenue = orders.filter((o) => ["paid", "shipped", "completed"].includes(o.status)).reduce((s, o) => s + Number(o.price_usd || 0), 0);
      const totalViews = listings.reduce((s, l) => s + (l.views_count ?? 0), 0);
      const byCategory: Record<string, { count: number; views: number }> = {};
      for (const l of listings) {
        const k = l.category as string;
        byCategory[k] ??= { count: 0, views: 0 };
        byCategory[k].count += 1;
        byCategory[k].views += l.views_count ?? 0;
      }
      const top = [...listings].sort((a, b) => (b.views_count ?? 0) - (a.views_count ?? 0)).slice(0, 5);
      return {
        listings: listings.length,
        totalViews,
        revenue,
        totalFavorites,
        offersReceived: offers.length,
        offersAccepted: offers.filter((o) => o.status === "accepted").length,
        byCategory,
        top,
        orders: orders.length,
        _favRes: favRes,
      };
    },
  });

  return (
    <AccountLayout title="Analytics">
      {isLoading || !data ? (
        <div className="text-sm text-silver/60">Loading…</div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KPI label="Listings" value={data.listings} />
            <KPI label="Total views" value={data.totalViews} />
            <KPI label="Favorites" value={data.totalFavorites} />
            <KPI label="Offers received" value={data.offersReceived} />
            <KPI label="Orders" value={data.orders} />
            <KPI label="Offers accepted" value={data.offersAccepted} />
            <KPI label="Revenue (USD)" value={`$${data.revenue.toLocaleString()}`} />
            <KPI label="Revenue (π)" value={`${(data.revenue / usdPerPi).toLocaleString(undefined, { maximumFractionDigits: 3 })} π`} />
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="glass rounded-2xl p-5 border border-white/10">
              <p className="text-xs uppercase tracking-widest text-silver/60">By category</p>
              <ul className="mt-3 space-y-2">
                {Object.entries(data.byCategory).map(([k, v]) => (
                  <li key={k} className="flex items-center justify-between text-sm">
                    <span>{CATEGORY_LABELS[k as CategoryKey] ?? k}</span>
                    <span className="text-silver/70">{v.count} listings · <span className="text-gold">{v.views} views</span></span>
                  </li>
                ))}
                {Object.keys(data.byCategory).length === 0 && <li className="text-xs text-silver/60">No data yet.</li>}
              </ul>
            </div>
            <div className="glass rounded-2xl p-5 border border-white/10">
              <p className="text-xs uppercase tracking-widest text-silver/60">Top listings by views</p>
              <ul className="mt-3 space-y-2">
                {data.top.map((l) => (
                  <li key={l.id} className="flex items-center justify-between text-sm">
                    <span className="truncate">{l.title}</span>
                    <span className="text-gold">{l.views_count} 👁</span>
                  </li>
                ))}
                {data.top.length === 0 && <li className="text-xs text-silver/60">No data yet.</li>}
              </ul>
            </div>
          </div>
        </>
      )}
    </AccountLayout>
  );
}

function KPI({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="glass rounded-2xl p-5 border border-white/10">
      <p className="text-xs uppercase tracking-widest text-silver/60">{label}</p>
      <p className="font-display text-3xl text-gradient-gold mt-1">{value}</p>
    </div>
  );
}
