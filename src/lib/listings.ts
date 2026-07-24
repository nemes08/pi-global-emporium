import { supabase } from "@/integrations/supabase/client";
import type { CategoryKey } from "./catalog";

export type ListingStatus = "draft" | "active" | "reserved" | "sold" | "archived";
export type PricingMode = "gcv" | "market";

export type ListingRow = {
  id: string;
  seller_id: string;
  title: string;
  description: string | null;
  category: CategoryKey | string;
  brand: string | null;
  model: string | null;
  year: number | null;
  country: string | null;
  city: string | null;
  price_usd: number;
  pricing_mode: string;
  negotiable: boolean;
  condition: string | null;
  mileage: number | null;
  fuel: string | null;
  transmission: string | null;
  seller_phone: string | null;
  seller_email: string | null;
  cover_image: string | null;
  status: ListingStatus;
  views_count: number;
  created_at: string;
  updated_at: string;
};

export type ListingMediaRow = {
  id: string;
  listing_id: string;
  seller_id: string;
  storage_path: string;
  media_type: "image" | "video" | string;
  sort_order: number;
  created_at: string;
};

/** Sign a listing media storage path to a temporary URL. */
export async function signMediaUrl(path: string | null | undefined, expires = 3600): Promise<string | null> {
  if (!path) return null;
  const { data } = await supabase.storage.from("listings").createSignedUrl(path, expires);
  return data?.signedUrl ?? null;
}

export async function signMediaUrls(paths: string[], expires = 3600): Promise<(string | null)[]> {
  if (!paths.length) return [];
  const results = await Promise.all(paths.map((p) => signMediaUrl(p, expires)));
  return results;
}

export const STATUS_LABEL: Record<ListingStatus, string> = {
  draft: "Draft",
  active: "Active",
  reserved: "Reserved",
  sold: "Sold",
  archived: "Archived",
};

export const STATUS_TONE: Record<ListingStatus, string> = {
  draft: "bg-white/5 text-silver/70 border-white/10",
  active: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  reserved: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  sold: "bg-sky-500/15 text-sky-300 border-sky-500/30",
  archived: "bg-neutral-500/15 text-neutral-300 border-neutral-500/30",
};
