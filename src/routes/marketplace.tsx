import { createFileRoute } from "@tanstack/react-router";
import { fallback, zodValidator } from "@tanstack/zod-adapter";
import { z } from "zod";
import { useMemo, useState } from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { SearchBar, emptyFilters, type SearchFilters } from "@/components/SearchBar";
import { ListingCard } from "@/components/ListingCard";
import { LISTINGS } from "@/lib/catalog";
import { useI18n } from "@/lib/i18n";

const searchSchema = z.object({
  category: fallback(z.string(), "").default(""),
});

export const Route = createFileRoute("/marketplace")({
  validateSearch: zodValidator(searchSchema),
  head: () => ({
    meta: [
      { title: "Marketplace — Pi Global Marketplace" },
      { name: "description", content: "Browse verified listings from around the world. Filter by category, brand, country, price and more — all priced in Pi." },
      { property: "og:title", content: "Marketplace — Pi Global Marketplace" },
      { property: "og:description", content: "Browse verified global listings priced in Pi." },
    ],
  }),
  component: Marketplace,
});

function Marketplace() {
  const { category } = Route.useSearch();
  const { t } = useI18n();
  const [filters, setFilters] = useState<SearchFilters>({ ...emptyFilters, category });

  const results = useMemo(() => {
    return LISTINGS.filter((l) => {
      if (filters.category && l.category !== filters.category) return false;
      if (filters.q && !`${l.title} ${l.brand ?? ""} ${l.model ?? ""}`.toLowerCase().includes(filters.q.toLowerCase())) return false;
      if (filters.country && l.country !== filters.country) return false;
      if (filters.city && !l.city.toLowerCase().includes(filters.city.toLowerCase())) return false;
      if (filters.brand && (l.brand ?? "").toLowerCase() !== filters.brand.toLowerCase()) return false;
      if (filters.model && !(l.model ?? "").toLowerCase().includes(filters.model.toLowerCase())) return false;
      if (filters.fuel && l.fuel !== filters.fuel) return false;
      if (filters.transmission && l.transmission !== filters.transmission) return false;
      if (filters.condition && l.condition !== filters.condition) return false;
      if (filters.verified && !l.verified) return false;
      if (filters.priceMin && l.pricePi < parseFloat(filters.priceMin)) return false;
      if (filters.priceMax && l.pricePi > parseFloat(filters.priceMax)) return false;
      if (filters.year && l.year !== parseInt(filters.year)) return false;
      return true;
    });
  }, [filters]);

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <h1 className="font-display text-4xl text-silver">{t("nav.marketplace")}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{t("featured.subtitle")}</p>

        <div className="mt-6">
          <SearchBar value={filters} onSubmit={setFilters} />
        </div>

        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {results.length === 0 ? (
            <div className="glass col-span-full rounded-2xl p-10 text-center text-muted-foreground">
              No listings match your filters.
            </div>
          ) : (
            results.map((l) => <ListingCard key={l.id} item={l} />)
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
