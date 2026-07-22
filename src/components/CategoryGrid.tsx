import { Link } from "@tanstack/react-router";
import { CATEGORIES } from "@/lib/catalog";
import { useI18n } from "@/lib/i18n";

export function CategoryGrid() {
  const { t } = useI18n();
  return (
    <section id="categories" className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:py-24">
      <div className="mb-10 flex items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-3xl sm:text-4xl text-silver">{t("categories.title")}</h2>
          <p className="mt-2 text-sm text-muted-foreground">{t("categories.subtitle")}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
        {CATEGORIES.map((c) => (
          <Link
            key={c.key}
            to="/marketplace"
            search={{ category: c.key }}
            className="group glass relative overflow-hidden rounded-2xl p-5 transition-all hover:-translate-y-1 hover:shadow-[var(--shadow-luxe)]"
          >
            <div className={`absolute inset-0 bg-gradient-to-br ${c.gradient} opacity-60 transition-opacity group-hover:opacity-100`} />
            <div className="relative">
              <div className="text-4xl">{c.icon}</div>
              <div className="mt-4 font-display text-lg text-white">{t(`cat.${c.key}`)}</div>
              <div className="mt-1 text-xs text-silver/70">{t(`cat.${c.key}.desc`)}</div>
              <div className="mt-4 text-xs text-gold opacity-0 transition-opacity group-hover:opacity-100">
                Explore →
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
