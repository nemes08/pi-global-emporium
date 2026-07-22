import { useState } from "react";
import { useI18n } from "@/lib/i18n";
import { CATEGORIES, COUNTRIES, FUELS, TRANSMISSIONS, CONDITIONS } from "@/lib/catalog";

export type SearchFilters = {
  q: string;
  category: string;
  brand: string;
  model: string;
  country: string;
  city: string;
  year: string;
  mileage: string;
  fuel: string;
  transmission: string;
  condition: string;
  priceMin: string;
  priceMax: string;
  verified: boolean;
};

export const emptyFilters: SearchFilters = {
  q: "", category: "", brand: "", model: "", country: "", city: "",
  year: "", mileage: "", fuel: "", transmission: "", condition: "",
  priceMin: "", priceMax: "", verified: false,
};

export function SearchBar({
  value = emptyFilters,
  onSubmit,
  compact = false,
}: {
  value?: SearchFilters;
  onSubmit?: (f: SearchFilters) => void;
  compact?: boolean;
}) {
  const { t } = useI18n();
  const [f, setF] = useState<SearchFilters>(value);
  const set = <K extends keyof SearchFilters>(k: K, v: SearchFilters[K]) => setF((p) => ({ ...p, [k]: v }));

  return (
    <section className={compact ? "" : "mx-auto max-w-7xl px-4 sm:px-6"}>
      <form
        onSubmit={(e) => { e.preventDefault(); onSubmit?.(f); }}
        className="glass-strong rounded-3xl p-5 sm:p-6 shadow-[var(--shadow-luxe)]"
      >
        {!compact && (
          <div className="mb-4 flex items-end justify-between gap-4">
            <h3 className="font-display text-xl text-silver">{t("search.title")}</h3>
          </div>
        )}

        <div className="flex flex-col gap-3 md:flex-row">
          <input
            type="search"
            value={f.q}
            onChange={(e) => set("q", e.target.value)}
            placeholder={t("search.placeholder")}
            className="w-full flex-1 rounded-full border border-white/10 bg-black/40 px-5 py-3 text-silver placeholder:text-muted-foreground/70 focus:border-gold/60 focus:outline-none focus:ring-2 focus:ring-gold/30"
          />
          <button type="submit" className="btn-gold rounded-full px-6 py-3 text-sm">{t("search.submit")}</button>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <Select label={t("search.category")} value={f.category} onChange={(v) => set("category", v)}
                  options={[["", t("search.any")], ...CATEGORIES.map((c) => [c.key, t(`cat.${c.key}`)] as [string, string])]} />
          <Input label={t("search.brand")} value={f.brand} onChange={(v) => set("brand", v)} />
          <Input label={t("search.model")} value={f.model} onChange={(v) => set("model", v)} />
          <Select label={t("search.country")} value={f.country} onChange={(v) => set("country", v)}
                  options={[["", t("search.any")], ...COUNTRIES.map((c) => [c, c] as [string, string])]} />
          <Input label={t("search.city")} value={f.city} onChange={(v) => set("city", v)} />
          <Input label={t("search.year")} value={f.year} onChange={(v) => set("year", v)} type="number" />
          <Input label={t("search.mileage")} value={f.mileage} onChange={(v) => set("mileage", v)} type="number" />
          <Select label={t("search.fuel")} value={f.fuel} onChange={(v) => set("fuel", v)}
                  options={[["", t("search.any")], ...FUELS.map((c) => [c, c] as [string, string])]} />
          <Select label={t("search.transmission")} value={f.transmission} onChange={(v) => set("transmission", v)}
                  options={[["", t("search.any")], ...TRANSMISSIONS.map((c) => [c, c] as [string, string])]} />
          <Select label={t("search.condition")} value={f.condition} onChange={(v) => set("condition", v)}
                  options={[["", t("search.any")], ...CONDITIONS.map((c) => [c, c] as [string, string])]} />
          <Input label={`${t("search.price")} (π min)`} value={f.priceMin} onChange={(v) => set("priceMin", v)} type="number" />
          <Input label={`${t("search.price")} (π max)`} value={f.priceMax} onChange={(v) => set("priceMax", v)} type="number" />
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <label className="inline-flex items-center gap-2 text-xs text-silver">
            <input type="checkbox" checked={f.verified} onChange={(e) => set("verified", e.target.checked)}
                   className="h-4 w-4 rounded border-white/20 bg-black/40 accent-[color:var(--gold)]" />
            {t("search.verified")}
          </label>
          <button type="button" onClick={() => setF(emptyFilters)} className="text-xs text-muted-foreground hover:text-white">
            {t("search.reset")}
          </button>
        </div>
      </form>
    </section>
  );
}

function Input({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] uppercase tracking-widest text-muted-foreground">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-silver focus:border-gold/60 focus:outline-none focus:ring-2 focus:ring-gold/30"
      />
    </label>
  );
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: [string, string][] }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] uppercase tracking-widest text-muted-foreground">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-silver focus:border-gold/60 focus:outline-none focus:ring-2 focus:ring-gold/30"
      >
        {options.map(([v, l]) => (
          <option key={v} value={v} className="bg-onyx">{l}</option>
        ))}
      </select>
    </label>
  );
}
