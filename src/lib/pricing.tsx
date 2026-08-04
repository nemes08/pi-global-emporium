import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useI18n } from "./i18n";
import { GCV_USD_PER_PI } from "./pricing.constants";

/** Community GCV Reference constant — 1 Pi = 314,159 USD */
export { GCV_USD_PER_PI } from "./pricing.constants";

export type PricingMode = "gcv" | "market";

export type FxRates = {
  /** Exchange Market Value: USD per 1 Pi (from public exchanges) */
  marketUsdPerPi: number;
  /** Fiat cross rates: units per 1 USD */
  eurPerUsd: number;
  tryPerUsd: number;
};

const DEFAULT_RATES: FxRates = {
  marketUsdPerPi: 0.32,
  eurPerUsd: 0.92,
  tryPerUsd: 40.5,
};

type PricingCtx = {
  rates: FxRates;
  setRates: (r: Partial<FxRates>) => void;
  reset: () => void;
  mode: PricingMode;
  setMode: (m: PricingMode) => void;
  /** USD per 1 Pi for the currently selected mode */
  usdPerPi: number;
};

const Ctx = createContext<PricingCtx | null>(null);

export function PricingProvider({ children }: { children: ReactNode }) {
  const [rates, setRatesState] = useState<FxRates>(DEFAULT_RATES);
  const [mode, setModeState] = useState<PricingMode>("gcv");

  useEffect(() => {
    try {
      const raw = localStorage.getItem("pigm.rates");
      if (raw) setRatesState({ ...DEFAULT_RATES, ...JSON.parse(raw) });
      const m = localStorage.getItem("pigm.mode") as PricingMode | null;
      if (m === "gcv" || m === "market") setModeState(m);
    } catch {}
  }, []);

  const setRates = (r: Partial<FxRates>) => {
    setRatesState((prev) => {
      const next = { ...prev, ...r };
      try { localStorage.setItem("pigm.rates", JSON.stringify(next)); } catch {}
      return next;
    });
  };

  const setMode = (m: PricingMode) => {
    setModeState(m);
    try { localStorage.setItem("pigm.mode", m); } catch {}
  };

  const reset = () => {
    setRatesState(DEFAULT_RATES);
    try { localStorage.removeItem("pigm.rates"); } catch {}
  };

  const usdPerPi = mode === "gcv" ? GCV_USD_PER_PI : rates.marketUsdPerPi;

  const value = useMemo(
    () => ({ rates, setRates, reset, mode, setMode, usdPerPi }),
    [rates, mode, usdPerPi],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function usePricing() {
  const c = useContext(Ctx);
  if (!c) throw new Error("usePricing must be used inside PricingProvider");
  return c;
}

const fmtCcy = (n: number, currency: string, locale = "en-US") =>
  new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: n >= 1000 ? 0 : 2,
  }).format(n);

const fmtPi = (n: number) => {
  const digits = n >= 1000 ? 2 : n >= 1 ? 5 : 8;
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: digits }).format(n) + " π";
};

/**
 * PriceDisplay renders a listing price given a seller-entered USD amount.
 * The Pi amount is derived from the active pricing mode (GCV by default).
 * Seller-entered USD is never overwritten.
 */
export function PriceDisplay({ usd, compact = false }: { usd: number; compact?: boolean }) {
  const { usdPerPi, mode, rates } = usePricing();
  const { t } = useI18n();

  const pi = usd / usdPerPi;
  const eur = usd * rates.eurPerUsd;
  const tryv = usd * rates.tryPerUsd;

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-xs uppercase tracking-widest text-muted-foreground">
          {t("price.seller")}
        </span>
        <span className="font-display text-2xl text-gradient-gold">{fmtPi(pi)}</span>
      </div>

      <div className="hairline-gold" />

      <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
        <dt className="text-muted-foreground">USD</dt>
        <dd className="text-right text-silver">{fmtCcy(usd, "USD")}</dd>

        <dt className="text-muted-foreground">EUR</dt>
        <dd className="text-right text-silver">{fmtCcy(eur, "EUR")}</dd>

        <dt className="text-muted-foreground">TRY</dt>
        <dd className="text-right text-silver">{fmtCcy(tryv, "TRY")}</dd>

        <dt className="col-span-2 mt-1 text-[10px] uppercase tracking-widest text-gold/80">
          {mode === "gcv" ? t("price.gcv") : t("price.market")}
        </dt>
        <dt className="text-muted-foreground">
          {mode === "gcv" ? "1 π (GCV)" : "1 π (Market)"}
        </dt>
        <dd className="text-right text-silver">{fmtCcy(usdPerPi, "USD")}</dd>
      </dl>

      {!compact && (
        <p className="pt-1 text-[10px] leading-snug text-muted-foreground/80">
          {t("price.notice")}
        </p>
      )}
    </div>
  );
}

/** Compact segmented control to switch pricing mode (GCV / Market). */
export function PricingModeToggle({ className = "" }: { className?: string }) {
  const { mode, setMode } = usePricing();
  const { t } = useI18n();
  const base =
    "px-3 py-1.5 text-[11px] font-medium uppercase tracking-widest transition-colors";
  return (
    <div
      role="tablist"
      aria-label={t("price.mode")}
      className={`inline-flex items-center rounded-full border border-white/10 bg-black/40 p-0.5 ${className}`}
    >
      <button
        role="tab"
        aria-selected={mode === "gcv"}
        onClick={() => setMode("gcv")}
        className={`${base} rounded-full ${mode === "gcv" ? "btn-gold text-onyx" : "text-silver/80 hover:text-white"}`}
      >
        GCV
      </button>
      <button
        role="tab"
        aria-selected={mode === "market"}
        onClick={() => setMode("market")}
        className={`${base} rounded-full ${mode === "market" ? "btn-gold text-onyx" : "text-silver/80 hover:text-white"}`}
      >
        {t("price.mode.market.short")}
      </button>
    </div>
  );
}
