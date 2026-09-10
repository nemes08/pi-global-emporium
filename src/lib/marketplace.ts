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

export type MarketplacePage = {
  items: MarketplaceItem[];
  total: number;
  page: number;
  pageSize: number;
};

export const PAGE_SIZE = 24;

/**
 * Public marketplace query. Only listings that are active AND approved by
 * moderation are visible here; the "verified sellers" filter is applied inside
 * the query (never after paging) so page counts stay correct.
 */
export async function fetchMarketplacePage(
  filters: MarketplaceFilters,
  sort: SortKey,
  page = 0,
  pageSize = PAGE_SIZE,
): Promise<MarketplacePage> {
  let verifiedSellerIds: string[] | null = null;
  if (filters.verified) {
    const { data } = await supabase
      .from("profiles")
      .select("id")
      .eq("verified", true)
      .returns<{ id: string }[]>();
    verifiedSellerIds = (data ?? []).map((r) => r.id);
    if (verifiedSellerIds.length === 0) {
      return { items: [], total: 0, page: 0, pageSize };
    }
  }

  let q = supabase
    .from("listings")
    .select("*", { count: "exact" })
    .eq("status", "active")
    .eq("moderation_status", "approved");

  if (verifiedSellerIds) q = q.in("seller_id", verifiedSellerIds);
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

  const from = page * pageSize;
  const { data, error, count } = await q.range(from, from + pageSize - 1).returns<ListingRow[]>();
  if (error || !data) return { items: [], total: 0, page, pageSize };

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

  return {
    items: data.map((listing) => ({
      listing,
      seller: sellerMap.get(listing.seller_id) ?? null,
    })),
    total: count ?? data.length,
    page,
    pageSize,
  };
}

/** Convenience wrapper for surfaces that only need a single page of items. */
export async function fetchMarketplace(
  filters: MarketplaceFilters,
  sort: SortKey,
  limit = PAGE_SIZE,
): Promise<MarketplaceItem[]> {
  return (await fetchMarketplacePage(filters, sort, 0, limit)).items;
}

export async function fetchFeatured(limit = 8): Promise<MarketplaceItem[]> {
  return fetchMarketplace({}, "featured", limit);
}
