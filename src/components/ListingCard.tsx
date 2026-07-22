import type { Listing } from "@/lib/catalog";
import { PriceDisplay } from "@/lib/pricing";
import { useI18n } from "@/lib/i18n";

export function ListingCard({ item }: { item: Listing }) {
  const { t } = useI18n();
  return (
    <article className="group glass overflow-hidden rounded-2xl transition-all hover:-translate-y-1 hover:shadow-[var(--shadow-luxe)]">
      <div className="relative aspect-[16/10] overflow-hidden">
        <img
          src={item.image}
          alt={item.title}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
        <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-3">
          <span className="glass rounded-full px-2.5 py-1 text-[10px] uppercase tracking-widest text-silver">
            {t(`cat.${item.category}`)}
          </span>
          {item.verified && (
            <span className="rounded-full bg-gold/90 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-widest text-onyx">
              ✓ {t("cta.verified")}
            </span>
          )}
        </div>
      </div>

      <div className="p-5">
        <h3 className="font-display text-lg leading-tight text-white">{item.title}</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          {item.city}, {item.country}
          {item.year ? ` · ${item.year}` : ""}
          {item.mileage ? ` · ${item.mileage.toLocaleString()} km` : ""}
        </p>

        <div className="mt-4 rounded-xl bg-black/30 p-4">
          <PriceDisplay pi={item.pricePi} compact />
        </div>
      </div>
    </article>
  );
}
