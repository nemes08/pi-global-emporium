import { supabase } from "@/integrations/supabase/client";

export type ReviewRow = {
  id: string;
  seller_id: string;
  buyer_id: string;
  order_id: string | null;
  rating: number;
  comment: string | null;
  created_at: string;
};

export type SellerStats = {
  reviewCount: number;
  ratingAvg: number | null;
  completedOrders: number;
  activeListings: number;
};

export async function fetchSellerStats(sellerId: string): Promise<SellerStats> {
  const [{ data: r }, { count: activeListings }, { count: completedOrders }] = await Promise.all([
    supabase.from("reviews").select("rating").eq("seller_id", sellerId).returns<{ rating: number }[]>(),
    supabase.from("listings").select("id", { count: "exact", head: true }).eq("seller_id", sellerId).eq("status", "active"),
    supabase.from("orders").select("id", { count: "exact", head: true }).eq("seller_id", sellerId).in("status", ["paid", "shipped", "completed"]),
  ]);

  const ratings = r ?? [];
  const sum = ratings.reduce((s, x) => s + Number(x.rating), 0);
  return {
    reviewCount: ratings.length,
    ratingAvg: ratings.length ? sum / ratings.length : null,
    completedOrders: completedOrders ?? 0,
    activeListings: activeListings ?? 0,
  };
}

export async function fetchSellerReviews(sellerId: string, limit = 20): Promise<ReviewRow[]> {
  const { data } = await supabase
    .from("reviews")
    .select("id, seller_id, buyer_id, order_id, rating, comment, created_at")
    .eq("seller_id", sellerId)
    .order("created_at", { ascending: false })
    .limit(limit)
    .returns<ReviewRow[]>();
  return data ?? [];
}

export async function submitReview(input: {
  sellerId: string;
  buyerId: string;
  orderId?: string | null;
  rating: number;
  comment?: string;
}) {
  const { error } = await supabase.from("reviews").insert({
    seller_id: input.sellerId,
    buyer_id: input.buyerId,
    order_id: input.orderId ?? null,
    rating: input.rating,
    comment: input.comment ?? null,
  });
  if (error) throw error;
}
