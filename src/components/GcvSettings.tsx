import { useState } from "react";
import { usePricing } from "@/lib/pricing";
import { useI18n } from "@/lib/i18n";

export function GcvSettings() {
  const { rates, setRates, reset } = usePricing();
  const { t } = useI18n();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label={t("price.settings")}
        title={t("price.settings")}
        className="btn-ghost-silver hidden sm:inline-flex items-center rounded-full px-3 py-1.5 text-xs"
      >
        ⚙︎ GCV
      </button>

      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setOpen(false)}>
          <div
            className="glass-strong w-full max-w-md rounded-2xl p-6 shadow-[var(--shadow-luxe)]"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-display text-xl text-gradient-gold">{t("price.settings")}</h3>
            <p className="mt-1 text-xs text-muted-foreground">{t("price.disclaimer")}</p>

            <div className="mt-5 space-y-4">
              <Field
                label={t("price.market.label")}
                value={rates.marketUsdPerPi}
                onChange={(v) => setRates({ marketUsdPerPi: v })}
                step={0.01}
              />
              <Field
                label={t("price.gcv.label")}
                value={rates.gcvUsdPerPi}
                onChange={(v) => setRates({ gcvUsdPerPi: v })}
                step={1}
              />
              <div className="grid grid-cols-2 gap-3">
                <Field label="EUR / USD" value={rates.eurPerUsd} onChange={(v) => setRates({ eurPerUsd: v })} step={0.01} />
                <Field label="TRY / USD" value={rates.tryPerUsd} onChange={(v) => setRates({ tryPerUsd: v })} step={0.1} />
              </div>
            </div>

            <div className="mt-6 flex items-center justify-between">
              <button onClick={reset} className="text-xs text-muted-foreground hover:text-white">Reset defaults</button>
              <button onClick={() => setOpen(false)} className="btn-gold rounded-full px-4 py-2 text-sm">Done</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function Field({ label, value, onChange, step }: { label: string; value: number; onChange: (v: number) => void; step: number }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs uppercase tracking-widest text-muted-foreground">{label}</span>
      <input
        type="number"
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-silver focus:border-gold/60 focus:outline-none focus:ring-2 focus:ring-gold/30"
      />
    </label>
  );
}
