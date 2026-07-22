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
            <li><a href="#" className="hover:text-white">About</a></li>
            <li><a href="#" className="hover:text-white">Careers</a></li>
            <li><a href="#" className="hover:text-white">Press</a></li>
          </ul>
        </div>
        <div>
          <h4 className="mb-3 text-xs uppercase tracking-widest text-gold">{t("footer.legal")}</h4>
          <ul className="space-y-2 text-sm text-silver/80">
            <li><a href="#" className="hover:text-white">Terms</a></li>
            <li><a href="#" className="hover:text-white">Privacy</a></li>
            <li><a href="#" className="hover:text-white">Cookies</a></li>
          </ul>
        </div>
        <div>
          <h4 className="mb-3 text-xs uppercase tracking-widest text-gold">{t("footer.resources")}</h4>
          <ul className="space-y-2 text-sm text-silver/80">
            <li><a href="#" className="hover:text-white">Pi Browser Guide</a></li>
            <li><a href="#" className="hover:text-white">Seller Handbook</a></li>
            <li><a href="#" className="hover:text-white">API</a></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/5 py-4 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Pi Global Marketplace · {t("footer.rights")}
      </div>
    </footer>
  );
}
