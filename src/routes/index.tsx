import { createFileRoute } from "@tanstack/react-router";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Hero } from "@/components/Hero";
import { CategoryGrid } from "@/components/CategoryGrid";
import { SearchBar } from "@/components/SearchBar";
import { ListingCard } from "@/components/ListingCard";
import { LISTINGS } from "@/lib/catalog";
import { useNavigate } from "@tanstack/react-router";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Pi Global Marketplace — Luxury Web3 Marketplace on Pi Network" },
      { name: "description", content: "One marketplace. Unlimited possibilities. Powered by Pi. Buy and sell vehicles, real estate, electronics, luxury goods and services in the Pi Network ecosystem." },
      { property: "og:title", content: "Pi Global Marketplace" },
      { property: "og:description", content: "The premium global Web3 marketplace for the Pi Network ecosystem." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});

function Home() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const featured = LISTINGS.slice(0, 6);

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
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((l) => <ListingCard key={l.id} item={l} />)}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
