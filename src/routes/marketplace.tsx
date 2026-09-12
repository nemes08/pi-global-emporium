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
import { fetchMarketplacePage, PAGE_SIZE, SORT_LABEL, type SortKey } from "@/lib/marketplace";
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
  const [page, setPage] = useState(0);

  const { data, isLoading } = useQuery({
    queryKey: ["marketplace", filters, sort, page],
    queryFn: () => fetchMarketplacePage(filters, sort, page),
  });

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const count = items.length;

  function applyFilters(next: SearchFilters) {
    setFilters(next);
    setPage(0);
  }
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
    setPage(0);
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
          <p className="text-xs text-silver/60" aria-live="polite">
            {isLoading
              ? "Loading listings…"
              : `${total.toLocaleString()} ${total === 1 ? "listing" : "listings"}${pages > 1 ? ` · page ${page + 1} of ${pages}` : ""}`}
          </p>
        </div>

        <div className="mt-6 space-y-4">
          <SmartSearch
            onResult={(r) => {
              setPage(0);
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
          <SearchBar value={filters} onSubmit={applyFilters} />
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
              onChange={(e) => { setPage(0); setSort(e.target.value as SortKey); }}
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
          <div className="glass mt-8 rounded-3xl border border-white/10 p-12 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-gold/30 bg-gradient-to-br from-gold/20 to-transparent text-3xl">🔎</div>
            <h3 className="mt-5 font-display text-2xl text-white">No listings match your filters</h3>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
              Try broadening the search — remove a filter, expand the price range, or explore a different category.
            </p>
            <button
              onClick={() => { setPage(0); setFilters(emptyFilters); setSort("featured"); }}
              className="btn-gold mt-6 rounded-full px-6 py-2.5 text-xs"
            >
              Clear all filters
            </button>
          </div>
        ) : (
          <>
            <div className={
              view === "grid"
                ? "mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
                : "mt-8 grid gap-6"
            }>
              {items.map((it) => <MarketplaceCard key={it.listing.id} item={it} />)}
            </div>

            {pages > 1 && (
              <nav aria-label="Pagination" className="mt-10 flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="btn-ghost-silver rounded-full px-5 py-2.5 text-xs disabled:opacity-40 min-h-[44px]"
                >
                  Previous
                </button>
                <span className="text-xs text-silver/60">Page {page + 1} of {pages}</span>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(pages - 1, p + 1))}
                  disabled={page >= pages - 1}
                  className="btn-gold rounded-full px-5 py-2.5 text-xs disabled:opacity-40 min-h-[44px]"
                >
                  Next
                </button>
              </nav>
            )}
          </>
        )}
      </main>
      <Footer />
    </>
  );
}
