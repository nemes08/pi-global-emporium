import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useI18n } from "./i18n";

export type FxRates = {
  /** Market rate: USD per 1 Pi (from exchanges) */
  marketUsdPerPi: number;
  /** Community Ecosystem Reference (GCV): USD per 1 Pi */
  gcvUsdPerPi: number;
  /** Fiat cross rates: units per 1 USD */
  eurPerUsd: number;
  tryPerUsd: number;
};

const DEFAULT_RATES: FxRates = {
  marketUsdPerPi: 0.32,
  gcvUsdPerPi: 314159,
  eurPerUsd: 0.92,
  tryPerUsd: 40.5,
};

type PricingCtx = {
  rates: FxRates;
  setRates: (r: Partial<FxRates>) => void;
  reset: () => void;
};

const Ctx = createContext<PricingCtx | null>(null);

export function PricingProvider({ children }: { children: ReactNode }) {
  const [rates, setRatesState] = useState<FxRates>(DEFAULT_RATES);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("pigm.rates");
      if (raw) setRatesState({ ...DEFAULT_RATES, ...JSON.parse(raw) });
    } catch {}
  }, []);

  const setRates = (r: Partial<FxRates>) => {
    setRatesState((prev) => {
      const next = { ...prev, ...r };
      try { localStorage.setItem("pigm.rates", JSON.stringify(next)); } catch {}
      return next;
    });
  };

  const reset = () => {
    setRatesState(DEFAULT_RATES);
    try { localStorage.removeItem("pigm.rates"); } catch {}
  };

  const value = useMemo(() => ({ rates, setRates, reset }), [rates]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function usePricing() {
  const c = useContext(Ctx);
  if (!c) throw new Error("usePricing must be used inside PricingProvider");
  return c;
}

const fmt = (n: number, currency: string, locale = "en-US") =>
  new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: n >= 1000 ? 0 : 2,
  }).format(n);

const fmtPi = (n: number) =>
  new Intl.NumberFormat("en-US", { maximumFractionDigits: 4 }).format(n) + " π";

export function PriceDisplay({ pi, compact = false }: { pi: number; compact?: boolean }) {
  const { rates } = usePricing();
  const { t } = useI18n();

  const usdMarket = pi * rates.marketUsdPerPi;
  const usdGcv = pi * rates.gcvUsdPerPi;
  const eur = usdMarket * rates.eurPerUsd;
  const tryv = usdMarket * rates.tryPerUsd;

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-xs uppercase tracking-widest text-muted-foreground">{t("price.seller")}</span>
        <span className="font-display text-2xl text-gradient-gold">{fmtPi(pi)}</span>
      </div>

      <div className="hairline-gold" />

      <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
        <dt className="text-muted-foreground">{t("price.market")}</dt>
        <dd className="text-right text-silver">{fmt(usdMarket, "USD")}</dd>

        <dt className="text-muted-foreground">EUR</dt>
        <dd className="text-right text-silver">{fmt(eur, "EUR")}</dd>

        <dt className="text-muted-foreground">TRY</dt>
        <dd className="text-right text-silver">{fmt(tryv, "TRY")}</dd>

        {!compact && (
          <>
            <dt className="col-span-2 mt-1 text-[10px] uppercase tracking-widest text-gold/80">
              {t("price.gcv")}
            </dt>
            <dt className="text-muted-foreground">USD (GCV)</dt>
            <dd className="text-right text-silver">{fmt(usdGcv, "USD")}</dd>
          </>
        )}
      </dl>

      {!compact && (
        <p className="pt-1 text-[10px] leading-snug text-muted-foreground/80">
          {t("price.disclaimer")}
        </p>
      )}
    </div>
  );
}
