import { createFileRoute } from "@tanstack/react-router";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { useI18n } from "@/lib/i18n";
import { CATEGORIES } from "@/lib/catalog";

export const Route = createFileRoute("/sell")({
  head: () => ({
    meta: [
      { title: "Sell on Pi Global Marketplace" },
      { name: "description", content: "List your product globally and get paid in Pi. Reach verified buyers across 180+ countries." },
      { property: "og:title", content: "Sell on Pi Global Marketplace" },
      { property: "og:description", content: "List globally. Get paid in Pi." },
    ],
  }),
  component: Sell,
});

function Sell() {
  const { t } = useI18n();
  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
        <h1 className="font-display text-4xl sm:text-5xl text-gradient-gold">{t("hero.sell")}</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Create a premium listing in minutes. Priced in Pi, visible worldwide.
        </p>

        <form className="glass-strong mt-8 space-y-5 rounded-3xl p-6 shadow-[var(--shadow-luxe)]" onSubmit={(e) => { e.preventDefault(); alert("Listing submitted for review."); }}>
          <Field label="Title">
            <input required className="input" placeholder="e.g. Porsche 911 Turbo S" />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t("search.category")}>
              <select required className="input">
                <option value="">—</option>
                {CATEGORIES.map((c) => <option key={c.key} value={c.key} className="bg-onyx">{t(`cat.${c.key}`)}</option>)}
              </select>
            </Field>
            <Field label={`${t("search.price")} (π)`}>
              <input required type="number" step="0.0001" className="input" />
            </Field>
            <Field label={t("search.country")}><input className="input" /></Field>
            <Field label={t("search.city")}><input className="input" /></Field>
          </div>
          <Field label="Description">
            <textarea rows={4} className="input" />
          </Field>
          <button className="btn-gold w-full rounded-full px-6 py-3 text-sm">Publish Listing</button>
          <p className="text-[10px] text-muted-foreground/80">{t("price.disclaimer")}</p>
        </form>
      </main>
      <Footer />
      <style>{`
        .input {
          width: 100%;
          border-radius: 0.75rem;
          border: 1px solid oklch(1 0 0 / 0.10);
          background: rgba(0,0,0,0.4);
          padding: 0.65rem 0.9rem;
          color: var(--silver);
          outline: none;
        }
        .input:focus { border-color: oklch(0.82 0.14 85 / 0.6); box-shadow: 0 0 0 3px oklch(0.82 0.14 85 / 0.2); }
      `}</style>
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] uppercase tracking-widest text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
