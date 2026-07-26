import { createFileRoute } from "@tanstack/react-router";
import { fallback, zodValidator } from "@tanstack/zod-adapter";
import { z } from "zod";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { SearchBar, emptyFilters, type SearchFilters } from "@/components/SearchBar";
import { SmartSearch } from "@/components/SmartSearch";
import { MarketplaceCard } from "@/components/MarketplaceCard";
import { fetchMarketplace, SORT_LABEL, type SortKey } from "@/lib/marketplace";
import { useI18n } from "@/lib/i18n";

const searchSchema = z.object({
  category: fallback(z.string(), "").default(""),
});

export const Route = createFileRoute("/marketplace")({
  validateSearch: zodValidator(searchSchema),
  head: () => ({
    meta: [
      { title: "Marketplace — Pi Global Marketplace" },
      { name: "description", content: "Browse verified global listings priced in Pi. Advanced filters, AI smart search, and premium sellers from around the world." },
      { property: "og:title", content: "Marketplace — Pi Global Marketplace" },
      { property: "og:description", content: "Browse verified global listings priced in Pi." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Marketplace,
});

const SORTS: SortKey[] = ["featured", "newest", "price_asc", "price_desc", "most_viewed"];

function Marketplace() {
  const { category } = Route.useSearch();
  const { t } = useI18n();
  const [filters, setFilters] = useState<SearchFilters>({ ...emptyFilters, category });
  const [sort, setSort] = useState<SortKey>("featured");
  const [view, setView] = useState<"grid" | "list">("grid");

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["marketplace", filters, sort],
    queryFn: () => fetchMarketplace(filters, sort),
  });

  const count = items.length;
  const activeChips = useMemo(() => {
    const chips: { k: keyof SearchFilters; label: string }[] = [];
    (Object.keys(filters) as (keyof SearchFilters)[]).forEach((k) => {
      const v = filters[k];
      if (k === "verified" && v) chips.push({ k, label: "Verified sellers" });
      else if (typeof v === "string" && v) chips.push({ k, label: `${k}: ${v}` });
    });
    return chips;
  }, [filters]);

  function clearChip(k: keyof SearchFilters) {
    setFilters((f) => ({ ...f, [k]: (typeof f[k] === "boolean" ? false : "") as never }));
  }

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="font-display text-3xl sm:text-4xl text-silver">{t("nav.marketplace")}</h1>
            <p className="mt-2 text-sm text-muted-foreground">{t("featured.subtitle")}</p>
          </div>
          <p className="text-xs text-silver/60">
            {isLoading ? "Loading…" : `${count} ${count === 1 ? "listing" : "listings"}`}
          </p>
        </div>

        <div className="mt-6 space-y-4">
          <SmartSearch
            onResult={(r) => {
              setFilters((prev) => ({
                ...prev,
                q: r.q ?? prev.q,
                category: r.category ?? prev.category,
                brand: r.brand ?? prev.brand,
                model: r.model ?? prev.model,
                country: r.country ?? prev.country,
                city: r.city ?? prev.city,
                condition: r.condition ?? prev.condition,
                priceMin: r.priceMin ?? prev.priceMin,
                priceMax: r.priceMax ?? prev.priceMax,
                verified: r.verified ?? prev.verified,
              }));
              if (r.sort) setSort(r.sort);
            }}
          />
          <SearchBar value={filters} onSubmit={setFilters} />
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {activeChips.length === 0 ? (
              <span className="text-xs text-silver/50">No filters applied</span>
            ) : (
              activeChips.map((c) => (
                <button key={c.k} onClick={() => clearChip(c.k)} className="glass rounded-full px-3 py-1 text-[11px] text-silver/80 hover:text-white hover:border-gold/40 border border-white/10">
                  {c.label} <span className="ml-1 text-gold">×</span>
                </button>
              ))
            )}
          </div>
          <div className="flex items-center gap-2">
            <label className="text-[10px] uppercase tracking-widest text-silver/60">Sort</label>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              className="rounded-full border border-white/10 bg-black/40 px-3 py-1.5 text-xs text-silver focus:outline-none focus:ring-2 focus:ring-gold/40"
            >
              {SORTS.map((s) => <option key={s} value={s} className="bg-onyx">{SORT_LABEL[s]}</option>)}
            </select>
            <div className="hidden sm:inline-flex rounded-full border border-white/10 bg-black/40 p-0.5 text-[11px]">
              <button onClick={() => setView("grid")} className={`rounded-full px-3 py-1 ${view === "grid" ? "btn-gold text-onyx" : "text-silver/70"}`}>Grid</button>
              <button onClick={() => setView("list")} className={`rounded-full px-3 py-1 ${view === "list" ? "btn-gold text-onyx" : "text-silver/70"}`}>List</button>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="glass rounded-2xl aspect-[4/3] animate-pulse border border-white/10" />
            ))}
          </div>
        ) : count === 0 ? (
          <div className="glass mt-8 rounded-2xl p-10 text-center text-muted-foreground border border-white/10">
            No listings match your filters. Try broadening your search.
          </div>
        ) : (
          <div className={
            view === "grid"
              ? "mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
              : "mt-8 grid gap-6"
          }>
            {items.map((it) => <MarketplaceCard key={it.listing.id} item={it} />)}
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}
