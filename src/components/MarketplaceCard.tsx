import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { usePricing } from "@/lib/pricing";
import { signMediaUrl } from "@/lib/listings";
import type { MarketplaceItem } from "@/lib/marketplace";
import { CATEGORY_LABELS, type CategoryKey } from "@/lib/catalog";
import { VerifiedBadge } from "./VerifiedBadge";

export function MarketplaceCard({ item }: { item: MarketplaceItem }) {
  const { listing: l, seller } = item;
  const { user } = useAuth();
  const { usdPerPi } = usePricing();
  const [cover, setCover] = useState<string | null>(null);
  const [fav, setFav] = useState(false);

  useEffect(() => { signMediaUrl(l.cover_image).then(setCover); }, [l.cover_image]);
  useEffect(() => {
    if (!user) return;
    supabase.from("favorites").select("listing_id").eq("user_id", user.id).eq("listing_id", l.id).maybeSingle()
      .then(({ data }) => setFav(!!data));
  }, [user, l.id]);

  async function toggleFav(e: React.MouseEvent) {
    e.preventDefault(); e.stopPropagation();
    if (!user) { window.location.href = "/auth"; return; }
    if (fav) {
      await supabase.from("favorites").delete().eq("user_id", user.id).eq("listing_id", l.id);
      setFav(false);
    } else {
      await supabase.from("favorites").insert({ user_id: user.id, listing_id: l.id });
      setFav(true);
    }
  }

  const pi = l.price_usd / usdPerPi;
  const cat = CATEGORY_LABELS[l.category as CategoryKey] ?? l.category;

  return (
    <Link
      to="/listing/$id"
      params={{ id: l.id }}
      className="group glass overflow-hidden rounded-2xl border border-white/10 transition-all hover:-translate-y-1 hover:border-gold/40 hover:shadow-[var(--shadow-luxe)] block"
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-black/40">
        {cover ? (
          <img src={cover} alt={l.title} loading="lazy" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
        ) : (
          <div className="h-full w-full grid place-items-center text-4xl text-silver/30">🖼️</div>
        )}
        <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-3">
          <span className="glass rounded-full px-2.5 py-1 text-[10px] uppercase tracking-widest text-silver">{cat}</span>
          {seller?.verified && <VerifiedBadge compact />}
        </div>
        <button
          onClick={toggleFav}
          aria-label={fav ? "Remove from favorites" : "Save to favorites"}
          className={`absolute bottom-3 right-3 h-9 w-9 rounded-full border grid place-items-center backdrop-blur-md transition-colors ${
            fav ? "bg-gold text-onyx border-gold" : "bg-black/50 text-silver border-white/15 hover:border-gold/60 hover:text-white"
          }`}
        >
          {fav ? "♥" : "♡"}
        </button>
      </div>

      <div className="p-5">
        <h3 className="font-display text-lg leading-tight text-white line-clamp-1">{l.title}</h3>
        <p className="mt-1 text-xs text-muted-foreground line-clamp-1">
          {[l.city, l.country].filter(Boolean).join(", ") || "—"}
          {l.year ? ` · ${l.year}` : ""}
          {l.mileage ? ` · ${l.mileage.toLocaleString()} km` : ""}
        </p>

        <div className="mt-4 flex items-baseline justify-between gap-2 rounded-xl bg-black/30 px-4 py-3">
          <span className="font-display text-lg text-gradient-gold">
            {pi.toLocaleString(undefined, { maximumFractionDigits: pi >= 1 ? 2 : 5 })} π
          </span>
          <span className="text-xs text-silver/70">${l.price_usd.toLocaleString()}</span>
        </div>

        {seller && (
          <div className="mt-3 flex items-center gap-2 text-[11px] text-silver/70">
            <span className="h-5 w-5 rounded-full bg-gradient-to-br from-gold/40 to-silver/20 grid place-items-center text-[9px] uppercase text-onyx font-semibold">
              {(seller.full_name?.[0] ?? seller.username?.[0] ?? "?").toUpperCase()}
            </span>
            <span className="truncate">
              {seller.full_name ?? seller.username ?? "Seller"}
            </span>
            {seller.verified && <span className="text-gold">✓</span>}
          </div>
        )}
      </div>
    </Link>
  );
}
