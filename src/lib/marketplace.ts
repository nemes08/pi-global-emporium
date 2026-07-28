import { supabase } from "@/integrations/supabase/client";
import type { ListingRow } from "./listings";

export type SortKey =
  | "newest"
  | "price_asc"
  | "price_desc"
  | "most_viewed"
  | "featured";

export const SORT_LABEL: Record<SortKey, string> = {
  newest: "Newest",
  price_asc: "Price: Low → High",
  price_desc: "Price: High → Low",
  most_viewed: "Most Viewed",
  featured: "Featured",
};

export type MarketplaceFilters = {
  q?: string;
  category?: string;
  brand?: string;
  model?: string;
  country?: string;
  city?: string;
  condition?: string;
  fuel?: string;
  transmission?: string;
  year?: string;
  mileage?: string;
  priceMin?: string;
  priceMax?: string;
  verified?: boolean;
};

export type SellerLite = {
  id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
  verified: boolean;
  dealer_tier: string | null;
};

export type MarketplaceItem = {
  listing: ListingRow;
  seller: SellerLite | null;
};

export async function fetchMarketplace(
  filters: MarketplaceFilters,
  sort: SortKey,
  limit = 48,
): Promise<MarketplaceItem[]> {
  const sel = (s: string): string => s;
  let q = supabase
    .from("listings")
    .select(sel("*"))
    .eq("status", "active");

  if (filters.category) q = q.eq("category", filters.category);
  if (filters.brand) q = q.ilike("brand", filters.brand);
  if (filters.model) q = q.ilike("model", `%${filters.model}%`);
  if (filters.country) q = q.eq("country", filters.country);
  if (filters.city) q = q.ilike("city", `%${filters.city}%`);
  if (filters.condition) q = q.eq("condition", filters.condition);
  if (filters.fuel) q = q.eq("fuel", filters.fuel);
  if (filters.transmission) q = q.eq("transmission", filters.transmission);
  if (filters.year) q = q.eq("year", parseInt(filters.year));
  if (filters.mileage) q = q.lte("mileage", parseInt(filters.mileage));
  if (filters.priceMin) q = q.gte("price_usd", parseFloat(filters.priceMin));
  if (filters.priceMax) q = q.lte("price_usd", parseFloat(filters.priceMax));
  if (filters.q) {
    const term = `%${filters.q}%`;
    q = q.or(`title.ilike.${term},description.ilike.${term},brand.ilike.${term},model.ilike.${term}`);
  }

  switch (sort) {
    case "price_asc": q = q.order("price_usd", { ascending: true }); break;
    case "price_desc": q = q.order("price_usd", { ascending: false }); break;
    case "most_viewed": q = q.order("views_count", { ascending: false }); break;
    case "featured": q = q.order("views_count", { ascending: false }).order("created_at", { ascending: false }); break;
    default: q = q.order("created_at", { ascending: false });
  }

  const { data, error } = await q.limit(limit).returns<ListingRow[]>();
  if (error || !data) return [];

  const sellerIds = Array.from(new Set(data.map((l) => l.seller_id)));
  let sellers: SellerLite[] = [];
  if (sellerIds.length) {
    const { data: pData } = await supabase
      .from("profiles")
      .select("id, full_name, username, avatar_url, verified, dealer_tier")
      .in("id", sellerIds)
      .returns<SellerLite[]>();
    sellers = pData ?? [];
  }
  const sellerMap = new Map(sellers.map((s) => [s.id, s]));

  let items: MarketplaceItem[] = data.map((listing) => ({
    listing,
    seller: sellerMap.get(listing.seller_id) ?? null,
  }));

  if (filters.verified) {
    items = items.filter((i) => i.seller?.verified);
  }

  return items;
}

export async function fetchFeatured(limit = 8): Promise<MarketplaceItem[]> {
  return fetchMarketplace({}, "featured", limit);
}
