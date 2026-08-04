import { Link } from "@tanstack/react-router";
import { useI18n } from "@/lib/i18n";

export function Footer() {
  const { t } = useI18n();
  return (
    <footer className="mt-24 border-t border-white/10 bg-black/40 backdrop-blur">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-full btn-gold text-onyx font-black">π</span>
            <span className="font-display text-lg text-silver">Pi Global Marketplace</span>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">{t("footer.tagline")}</p>
          <p className="mt-4 text-[10px] leading-relaxed text-muted-foreground/80">{t("price.disclaimer")}</p>
        </div>
        <div>
          <h4 className="mb-3 text-xs uppercase tracking-widest text-gold">{t("footer.company")}</h4>
          <ul className="space-y-2 text-sm text-silver/80">
            <li><Link to="/" hash="about" className="hover:text-white">About</Link></li>
            <li><Link to="/marketplace" className="hover:text-white">Marketplace</Link></li>
            <li><Link to="/sell" className="hover:text-white">Sell</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="mb-3 text-xs uppercase tracking-widest text-gold">{t("footer.legal")}</h4>
          <ul className="space-y-2 text-sm text-silver/80">
            <li><Link to="/terms" className="hover:text-white">Terms</Link></li>
            <li><Link to="/privacy" className="hover:text-white">Privacy</Link></li>
            <li><Link to="/cookies" className="hover:text-white">Cookies</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="mb-3 text-xs uppercase tracking-widest text-gold">{t("footer.resources")}</h4>
          <ul className="space-y-2 text-sm text-silver/80">
            <li><a href="https://minepi.com/download/" target="_blank" rel="noreferrer" className="hover:text-white">Get Pi Browser</a></li>
            <li><Link to="/verification" className="hover:text-white">Seller verification</Link></li>
            <li><Link to="/marketplace" className="hover:text-white">Browse listings</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/5 py-4 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Pi Global Marketplace · {t("footer.rights")}
      </div>
    </footer>
  );
}
