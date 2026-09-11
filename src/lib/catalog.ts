export type CategoryKey =
  | "vehicles"
  | "electronics"
  | "realestate"
  | "luxury"
  | "services"
  | "motorcycles"
  | "boats"
  | "trucks"
  | "heavy-equipment"
  | "art-collectibles";

export const CATEGORIES: {
  key: CategoryKey;
  icon: string;
  gradient: string;
}[] = [
  { key: "vehicles",         icon: "🚘", gradient: "from-amber-300/20 to-yellow-600/10" },
  { key: "realestate",       icon: "🏛️", gradient: "from-yellow-200/20 to-amber-700/10" },
  { key: "electronics",      icon: "📱", gradient: "from-slate-200/20 to-slate-500/10" },
  { key: "luxury",           icon: "💎", gradient: "from-amber-200/25 to-orange-500/10" },
  { key: "services",         icon: "🛎️", gradient: "from-neutral-200/20 to-neutral-500/10" },
  { key: "motorcycles",      icon: "🏍️", gradient: "from-amber-400/20 to-red-600/10" },
  { key: "boats",            icon: "⛵", gradient: "from-sky-200/20 to-blue-700/10" },
  { key: "trucks",           icon: "🚚", gradient: "from-yellow-300/20 to-orange-700/10" },
  { key: "heavy-equipment",  icon: "🚜", gradient: "from-yellow-500/20 to-neutral-700/10" },
  { key: "art-collectibles", icon: "🎨", gradient: "from-fuchsia-300/20 to-amber-400/10" },
];

/** Human labels for categories that don't have i18n keys yet (fallback). */
export const CATEGORY_LABELS: Record<CategoryKey, string> = {
  vehicles: "Vehicles",
  realestate: "Real Estate",
  electronics: "Electronics",
  luxury: "Luxury",
  services: "Services",
  motorcycles: "Motorcycles",
  boats: "Boats",
  trucks: "Trucks",
  "heavy-equipment": "Heavy Equipment",
  "art-collectibles": "Art & Collectibles",
};


export const COUNTRIES = [
  "Germany","Turkey","Switzerland","USA","France","Italy","UK","Spain","Netherlands",
  "Japan","South Korea","China","Russia","Brazil","Portugal",
];
export const FUELS = ["Petrol", "Diesel", "Hybrid", "Electric", "LPG"];
export const TRANSMISSIONS = ["Manual", "Automatic", "PDK", "DCT", "CVT"];
export const CONDITIONS = ["new", "used", "certified"] as const;
