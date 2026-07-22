import { Link } from "@tanstack/react-router";
import { useI18n } from "@/lib/i18n";

export function Hero() {
  const { t } = useI18n();
  return (
    <section className="relative overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-gold/20 blur-[120px]" />
        <div className="absolute bottom-0 right-0 h-[380px] w-[380px] rounded-full bg-silver/10 blur-[120px]" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 pb-16 pt-14 sm:px-6 sm:pt-20 lg:pt-28">
        <div className="mx-auto max-w-3xl text-center">
          <span className="glass inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs uppercase tracking-widest text-silver">
            <span className="h-1.5 w-1.5 rounded-full bg-gold animate-pulse" />
            {t("hero.badge")}
          </span>

          <h1 className="mt-6 font-display text-5xl leading-[1.05] sm:text-6xl lg:text-7xl">
            <span className="text-gradient-gold">{t("hero.title")}</span>
          </h1>

          <p className="mx-auto mt-5 max-w-2xl text-base text-silver/80 sm:text-lg">
            {t("hero.subtitle")}
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link to="/marketplace" className="btn-gold rounded-full px-6 py-3 text-sm sm:text-base">
              {t("hero.browse")}
            </Link>
            <Link to="/sell" className="btn-ghost-silver rounded-full px-6 py-3 text-sm sm:text-base">
              {t("hero.sell")}
            </Link>
            <button
              className="btn-ghost-silver rounded-full px-6 py-3 text-sm sm:text-base"
              onClick={() => alert("Pi Wallet connection will be enabled inside Pi Browser.")}
            >
              {t("hero.wallet")}
            </button>
          </div>

          <div className="mt-14 grid grid-cols-3 gap-4 sm:gap-8">
            {[
              { k: "Listings", v: "128K+" },
              { k: "Countries", v: "180+" },
              { k: "Pi Circulating", v: "π ∞" },
            ].map((s) => (
              <div key={s.k} className="glass rounded-2xl px-4 py-4">
                <div className="font-display text-2xl text-gradient-gold sm:text-3xl">{s.v}</div>
                <div className="mt-1 text-[10px] uppercase tracking-widest text-muted-foreground">{s.k}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
