import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Hero } from "@/components/Hero";
import { CategoryGrid } from "@/components/CategoryGrid";
import { SearchBar } from "@/components/SearchBar";
import { FeaturedCarousel } from "@/components/FeaturedCarousel";
import { fetchFeatured } from "@/lib/marketplace";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Pi Global Marketplace | Web3 Luxury Marketplace" },
      { name: "description", content: "Global Web3 marketplace powered by Pi Network. Discover verified listings — vehicles, real estate, electronics, luxury and services — with AI smart search and Pi-native pricing." },
      { property: "og:title", content: "Pi Global Marketplace | Web3 Luxury Marketplace" },
      { property: "og:description", content: "Global Web3 marketplace powered by Pi Network. Verified sellers, AI smart search, Pi-native pricing." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});

function Home() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const { data: featured = [] } = useQuery({
    queryKey: ["featured"],
    queryFn: () => fetchFeatured(10),
  });

  return (
    <>
      <Navbar />
      <main>
        <Hero />

        <div className="mx-auto -mt-4 max-w-7xl px-4 sm:px-6">
          <SearchBar onSubmit={() => navigate({ to: "/marketplace" })} />
        </div>

        <CategoryGrid />

        <section className="mx-auto max-w-7xl px-4 pb-24 sm:px-6">
          <div className="mb-8 flex items-end justify-between">
            <div>
              <h2 className="font-display text-3xl sm:text-4xl text-silver">{t("featured.title")}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{t("featured.subtitle")}</p>
            </div>
          </div>
          {featured.length === 0 ? (
            <div className="glass rounded-3xl border border-white/10 p-12 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-gold/30 bg-gradient-to-br from-gold/20 to-transparent text-3xl">✨</div>
              <h3 className="mt-5 font-display text-2xl text-white">No listings available yet</h3>
              <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
                Be the first to publish a premium listing and reach verified buyers worldwide.
              </p>
              <button
                onClick={() => navigate({ to: "/sell" })}
                className="btn-gold mt-6 rounded-full px-6 py-2.5 text-xs"
              >
                Publish a listing
              </button>
            </div>
          ) : (
            <FeaturedCarousel items={featured} />
          )}
        </section>
      </main>
      <Footer />
    </>
  );
}
