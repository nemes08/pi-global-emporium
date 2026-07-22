export type CategoryKey = "vehicles" | "electronics" | "realestate" | "luxury" | "services";

export const CATEGORIES: {
  key: CategoryKey;
  icon: string;
  gradient: string;
}[] = [
  { key: "vehicles",    icon: "🚘", gradient: "from-amber-300/20 to-yellow-600/10" },
  { key: "electronics", icon: "📱", gradient: "from-slate-200/20 to-slate-500/10" },
  { key: "realestate",  icon: "🏛️", gradient: "from-yellow-200/20 to-amber-700/10" },
  { key: "luxury",      icon: "💎", gradient: "from-amber-200/25 to-orange-500/10" },
  { key: "services",    icon: "🛎️", gradient: "from-neutral-200/20 to-neutral-500/10" },
];

export type Listing = {
  id: string;
  title: string;
  category: CategoryKey;
  brand?: string;
  model?: string;
  country: string;
  city: string;
  year?: number;
  mileage?: number;
  fuel?: string;
  transmission?: string;
  condition: "new" | "used" | "certified";
  pricePi: number;
  verified: boolean;
  image: string;
};

export const LISTINGS: Listing[] = [
  {
    id: "l1",
    title: "Porsche 911 Turbo S",
    category: "vehicles",
    brand: "Porsche",
    model: "911 Turbo S",
    country: "Germany", city: "Munich",
    year: 2023, mileage: 8200, fuel: "Petrol", transmission: "PDK",
    condition: "certified",
    pricePi: 480000,
    verified: true,
    image: "https://images.unsplash.com/photo-1544636331-e26879cd4d9b?w=1200&q=80",
  },
  {
    id: "l2",
    title: "Penthouse · Bosphorus View",
    category: "realestate",
    country: "Turkey", city: "Istanbul",
    condition: "new",
    pricePi: 3200000,
    verified: true,
    image: "https://images.unsplash.com/photo-1613977257363-707ba9348227?w=1200&q=80",
  },
  {
    id: "l3",
    title: "Rolex Daytona · 116500LN",
    category: "luxury",
    brand: "Rolex", model: "Daytona",
    country: "Switzerland", city: "Geneva",
    condition: "used",
    pricePi: 96000,
    verified: true,
    image: "https://images.unsplash.com/photo-1523170335258-f5ed11844a49?w=1200&q=80",
  },
  {
    id: "l4",
    title: "MacBook Pro 16″ M4 Max",
    category: "electronics",
    brand: "Apple", model: "MacBook Pro",
    country: "USA", city: "New York",
    condition: "new",
    pricePi: 12800,
    verified: true,
    image: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=1200&q=80",
  },
  {
    id: "l5",
    title: "Brand Design & Web Studio",
    category: "services",
    country: "France", city: "Paris",
    condition: "new",
    pricePi: 4500,
    verified: false,
    image: "https://images.unsplash.com/photo-1522199755839-a2bacb67c546?w=1200&q=80",
  },
  {
    id: "l6",
    title: "Lamborghini Huracán EVO",
    category: "vehicles",
    brand: "Lamborghini", model: "Huracán",
    country: "Italy", city: "Milan",
    year: 2022, mileage: 12500, fuel: "Petrol", transmission: "DCT",
    condition: "used",
    pricePi: 620000,
    verified: true,
    image: "https://images.unsplash.com/photo-1580414057403-c5f451f30e1c?w=1200&q=80",
  },
];

export const COUNTRIES = [
  "Germany","Turkey","Switzerland","USA","France","Italy","UK","Spain","Netherlands",
  "Japan","South Korea","China","Russia","Brazil","Portugal",
];
export const FUELS = ["Petrol", "Diesel", "Hybrid", "Electric", "LPG"];
export const TRANSMISSIONS = ["Manual", "Automatic", "PDK", "DCT", "CVT"];
export const CONDITIONS = ["new", "used", "certified"] as const;
