import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { LANGS, useI18n, type LangCode } from "@/lib/i18n";
import { GcvSettings } from "./GcvSettings";

export function Navbar() {
  const { t, lang, setLang } = useI18n();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40">
      <div className="glass-strong border-b border-white/10">
        <nav className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <span className="grid h-9 w-9 place-items-center rounded-full btn-gold text-onyx font-black">π</span>
            <span className="font-display text-lg sm:text-xl tracking-tight">
              <span className="text-gradient-gold">Pi Global</span>{" "}
              <span className="text-silver">Marketplace</span>
            </span>
          </Link>

          <div className="hidden items-center gap-6 text-sm text-silver/80 md:flex">
            <Link to="/marketplace" className="hover:text-white transition-colors">{t("nav.marketplace")}</Link>
            <Link to="/sell" className="hover:text-white transition-colors">{t("nav.sell")}</Link>
            <a href="/#categories" className="hover:text-white transition-colors">{t("nav.categories")}</a>
          </div>

          <div className="flex items-center gap-2">
            <select
              aria-label="Language"
              value={lang}
              onChange={(e) => setLang(e.target.value as LangCode)}
              className="hidden sm:block rounded-full bg-white/5 border border-white/10 px-3 py-1.5 text-xs text-silver focus:outline-none focus:ring-2 focus:ring-gold/40"
            >
              {LANGS.map((l) => (
                <option key={l.code} value={l.code} className="bg-onyx">
                  {l.flag}  {l.label}
                </option>
              ))}
            </select>
            <GcvSettings />
            <button
              className="btn-gold hidden sm:inline-flex items-center rounded-full px-4 py-2 text-sm"
              onClick={() => alert("Pi Wallet connection will be enabled inside Pi Browser.")}
            >
              {t("nav.wallet")}
            </button>
            <button
              className="md:hidden rounded-full border border-white/10 bg-white/5 px-3 py-2 text-silver"
              onClick={() => setOpen((v) => !v)}
              aria-label="Menu"
            >
              ☰
            </button>
          </div>
        </nav>

        {open && (
          <div className="md:hidden border-t border-white/10 px-4 py-3 space-y-2 text-sm">
            <Link to="/marketplace" onClick={() => setOpen(false)} className="block py-1.5 text-silver/90">{t("nav.marketplace")}</Link>
            <Link to="/sell" onClick={() => setOpen(false)} className="block py-1.5 text-silver/90">{t("nav.sell")}</Link>
            <a href="/#categories" onClick={() => setOpen(false)} className="block py-1.5 text-silver/90">{t("nav.categories")}</a>
            <div className="flex gap-2 pt-2">
              <select
                aria-label="Language"
                value={lang}
                onChange={(e) => setLang(e.target.value as LangCode)}
                className="flex-1 rounded-full bg-white/5 border border-white/10 px-3 py-2 text-xs text-silver"
              >
                {LANGS.map((l) => (
                  <option key={l.code} value={l.code} className="bg-onyx">{l.flag} {l.label}</option>
                ))}
              </select>
            </div>
            <button className="btn-gold w-full rounded-full px-4 py-2 text-sm" onClick={() => alert("Pi Wallet connection will be enabled inside Pi Browser.")}>
              {t("nav.wallet")}
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
