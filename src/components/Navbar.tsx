import { Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { LANGS, useI18n, type LangCode } from "@/lib/i18n";
import { GcvSettings } from "./GcvSettings";
import { PricingModeToggle } from "@/lib/pricing";
import { useAuth } from "@/lib/auth";

export function Navbar() {
  const { t, lang, setLang } = useI18n();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  async function handleSignOut() {
    await signOut();
    navigate({ to: "/", replace: true });
  }

  return (
    <header className="sticky top-0 z-40">
      <div className="glass-strong border-b border-white/10">
        <nav className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Link to="/" className="flex min-w-0 items-center gap-2">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full btn-gold text-onyx font-black">π</span>
            <span className="truncate font-display text-base tracking-tight sm:text-xl">
              <span className="text-gradient-gold">Pi Global</span>{" "}
              <span className="hidden text-silver xs:inline">Marketplace</span>
            </span>
          </Link>

          <div className="hidden items-center gap-6 text-sm text-silver/80 md:flex">
            <Link to="/marketplace" className="hover:text-white transition-colors">{t("nav.marketplace")}</Link>
            <Link to="/sell" className="hover:text-white transition-colors">{t("nav.sell")}</Link>
            <a href="/#categories" className="hover:text-white transition-colors">{t("nav.categories")}</a>
          </div>

          <div className="flex shrink-0 items-center gap-2">

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
            <PricingModeToggle className="hidden md:inline-flex" />
            <GcvSettings />
            {user ? (
              <>
                <Link to="/dashboard" className="btn-gold hidden sm:inline-flex items-center rounded-full px-4 py-2 text-sm">
                  My Account
                </Link>
                <button
                  onClick={handleSignOut}
                  className="hidden md:inline-flex btn-ghost-silver rounded-full px-3 py-2 text-xs"
                >
                  Sign out
                </button>
              </>
            ) : (
              <Link to="/auth" className="btn-gold hidden sm:inline-flex items-center rounded-full px-4 py-2 text-sm">
                Sign in
              </Link>
            )}
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
            {user ? (
              <>
                <Link to="/dashboard" onClick={() => setOpen(false)} className="btn-gold w-full inline-flex justify-center rounded-full px-4 py-2 text-sm">
                  My Account
                </Link>
                <button className="w-full btn-ghost-silver rounded-full px-4 py-2 text-sm" onClick={() => { setOpen(false); handleSignOut(); }}>
                  Sign out
                </button>
              </>
            ) : (
              <Link to="/auth" onClick={() => setOpen(false)} className="btn-gold w-full inline-flex justify-center rounded-full px-4 py-2 text-sm">
                Sign in
              </Link>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
