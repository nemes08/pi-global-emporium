import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AccountLayout } from "@/components/AccountLayout";
import { usePricing } from "@/lib/pricing";
import { signMediaUrl, type ListingRow } from "@/lib/listings";

export const Route = createFileRoute("/_authenticated/favorites")({
  head: () => ({
    meta: [
      { title: "Favorites · Pi Global Marketplace" },
      { name: "description", content: "Your saved listings on Pi Global Marketplace." },
      { property: "og:title", content: "Favorites · Pi Global Marketplace" },
      { property: "og:description", content: "Everything you love, saved in one premium place." },
    ],
  }),
  component: FavoritesPage,
});

function FavoritesPage() {
  const qc = useQueryClient();
  const { usdPerPi } = usePricing();
  const { data, isLoading } = useQuery({
    queryKey: ["my-favorites"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return [];
      const { data } = await supabase
        .from("favorites")
        .select("listing_id, created_at, listings(*)")
        .eq("user_id", u.user.id)
        .order("created_at", { ascending: false });
      return (data ?? []).map((r: { listings: ListingRow | null }) => r.listings).filter(Boolean) as ListingRow[];
    },
  });

  async function remove(listingId: string) {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    await supabase.from("favorites").delete().eq("user_id", u.user.id).eq("listing_id", listingId);
    qc.invalidateQueries({ queryKey: ["my-favorites"] });
  }

  return (
    <AccountLayout title="Favorites">
      {isLoading ? (
        <div className="text-sm text-silver/60">Loading…</div>
      ) : !data || data.length === 0 ? (
        <EmptyFavorites />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {data.map((l) => <FavCard key={l.id} l={l} usdPerPi={usdPerPi} onRemove={remove} />)}
        </div>
      )}
    </AccountLayout>
  );
}

function EmptyFavorites() {
  return (
    <div className="glass rounded-2xl p-10 text-center border border-white/10">
      <div className="text-4xl">♡</div>
      <h3 className="font-display text-2xl mt-2 text-gradient-gold">No favorites yet</h3>
      <p className="text-sm text-silver/70 mt-1">Save listings to compare and revisit them.</p>
      <Link to="/marketplace" className="mt-4 inline-flex btn-gold rounded-full px-5 py-2 text-sm">Browse marketplace</Link>
    </div>
  );
}

function FavCard({ l, usdPerPi, onRemove }: { l: ListingRow; usdPerPi: number; onRemove: (id: string) => void }) {
  const [cover, setCover] = useState<string | null>(null);
  useEffect(() => { signMediaUrl(l.cover_image).then(setCover); }, [l.cover_image]);
  const pi = l.price_usd / usdPerPi;
  return (
    <article className="glass rounded-2xl overflow-hidden border border-white/10">
      <Link to="/listing/$id" params={{ id: l.id }} className="block relative aspect-[16/10] bg-black/40 overflow-hidden">
        {cover ? <img src={cover} alt={l.title} className="h-full w-full object-cover" /> : <div className="h-full w-full grid place-items-center text-3xl text-silver/40">🖼️</div>}
      </Link>
      <div className="p-4">
        <h3 className="font-display text-lg truncate">{l.title}</h3>
        <p className="text-xs text-silver/60">{l.city || "—"}{l.country ? `, ${l.country}` : ""}</p>
        <div className="mt-2 flex items-baseline justify-between">
          <span className="font-display text-xl text-gradient-gold">{pi.toLocaleString(undefined, { maximumFractionDigits: 5 })} π</span>
          <span className="text-xs text-silver/60">${l.price_usd.toLocaleString()}</span>
        </div>
        <div className="mt-3 flex gap-2">
          <Link to="/listing/$id" params={{ id: l.id }} className="btn-gold rounded-full px-3 py-1 text-[11px]">View</Link>
          <button onClick={() => onRemove(l.id)} className="btn-ghost-silver rounded-full px-3 py-1 text-[11px]">Remove</button>
        </div>
      </div>
    </article>
  );
}
