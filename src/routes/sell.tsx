import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/sell")({
  head: () => ({
    meta: [
      { title: "Sell on Pi Global Marketplace" },
      { name: "description", content: "List your product globally and get paid in Pi. Reach verified buyers across 180+ countries with premium tools, photos and video." },
      { property: "og:title", content: "Sell on Pi Global Marketplace" },
      { property: "og:description", content: "List globally. Get paid in Pi." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Sell,
});

function Sell() {
  const { t } = useI18n();
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  // Signed-in users go straight to the full listing wizard.
  useEffect(() => {
    if (!loading && user) navigate({ to: "/listings/new" });
  }, [loading, user, navigate]);

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
        <div className="glass-strong rounded-3xl border border-gold/20 p-8 shadow-[var(--shadow-luxe)] sm:p-12">
          <span className="text-[10px] uppercase tracking-widest text-gold">✦ Sell on Pi</span>
          <h1 className="mt-2 font-display text-4xl sm:text-5xl text-gradient-gold">{t("hero.sell")}</h1>
          <p className="mt-4 max-w-2xl text-sm text-muted-foreground">
            Create a premium global listing in minutes. Upload high-resolution photos and video,
            set your price in Pi with the Community GCV reference, and reach verified buyers worldwide.
          </p>

          <ul className="mt-8 grid gap-3 sm:grid-cols-2">
            {[
              ["Unlimited photos + optional video", "Showcase your product like a boutique dealer."],
              ["Priced in Pi with Community GCV", "Auto-converts to USD, EUR and TRY."],
              ["10+ categories", "Vehicles, real estate, luxury, art, marine & more."],
              ["Verified seller trust", "Verified badge boosts buyer confidence."],
            ].map(([title, body]) => (
              <li key={title} className="glass rounded-2xl border border-white/10 p-4">
                <div className="font-display text-sm text-white">{title}</div>
                <div className="mt-1 text-xs text-silver/70">{body}</div>
              </li>
            ))}
          </ul>

          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <Link
              to="/auth"
              className="btn-gold rounded-full px-8 py-3 text-center text-sm"
            >
              Sign in to publish
            </Link>
            <Link
              to="/marketplace"
              className="btn-ghost-silver rounded-full px-8 py-3 text-center text-sm"
            >
              Browse marketplace
            </Link>
          </div>

          <p className="mt-6 text-[10px] text-muted-foreground/80">{t("price.disclaimer")}</p>
        </div>
      </main>
      <Footer />
    </>
  );
}
