import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type LangCode =
  | "en" | "tr" | "de" | "fr" | "es" | "it" | "pt" | "nl" | "ru" | "ar" | "zh" | "ja" | "ko";

export const LANGS: { code: LangCode; label: string; flag: string; rtl?: boolean }[] = [
  { code: "en", label: "English", flag: "🇬🇧" },
  { code: "tr", label: "Türkçe", flag: "🇹🇷" },
  { code: "de", label: "Deutsch", flag: "🇩🇪" },
  { code: "fr", label: "Français", flag: "🇫🇷" },
  { code: "es", label: "Español", flag: "🇪🇸" },
  { code: "it", label: "Italiano", flag: "🇮🇹" },
  { code: "pt", label: "Português", flag: "🇵🇹" },
  { code: "nl", label: "Nederlands", flag: "🇳🇱" },
  { code: "ru", label: "Русский", flag: "🇷🇺" },
  { code: "ar", label: "العربية", flag: "🇸🇦", rtl: true },
  { code: "zh", label: "中文", flag: "🇨🇳" },
  { code: "ja", label: "日本語", flag: "🇯🇵" },
  { code: "ko", label: "한국어", flag: "🇰🇷" },
];

type Dict = Record<string, string>;

const en: Dict = {
  "nav.marketplace": "Marketplace",
  "nav.sell": "Sell",
  "nav.categories": "Categories",
  "nav.about": "About",
  "nav.wallet": "Connect Pi Wallet",

  "hero.title": "Pi Global Marketplace",
  "hero.subtitle": "One Marketplace. Unlimited Possibilities. Powered by Pi.",
  "hero.browse": "Browse Marketplace",
  "hero.sell": "Sell Your Product",
  "hero.wallet": "Connect Pi Wallet",
  "hero.badge": "Web3 · Pi Network Ecosystem",

  "categories.title": "Explore Categories",
  "categories.subtitle": "Curated marketplaces for every asset class.",
  "cat.vehicles": "Vehicles",
  "cat.electronics": "Electronics",
  "cat.realestate": "Real Estate",
  "cat.luxury": "Luxury",
  "cat.services": "Services",
  "cat.motorcycles": "Motorcycles",
  "cat.boats": "Boats & Yachts",
  "cat.trucks": "Trucks",
  "cat.heavy-equipment": "Heavy Equipment",
  "cat.art-collectibles": "Art & Collectibles",
  "cat.vehicles.desc": "Cars, SUVs, EVs, and performance vehicles.",
  "cat.electronics.desc": "Phones, laptops, cameras, audio.",
  "cat.realestate.desc": "Homes, penthouses, villas, land.",
  "cat.luxury.desc": "Watches, jewelry, fashion, collectibles.",
  "cat.services.desc": "Professional and digital services.",
  "cat.motorcycles.desc": "Sport, touring and adventure bikes.",
  "cat.boats.desc": "Yachts, superyachts, motorboats.",
  "cat.trucks.desc": "Heavy trucks and commercial fleet.",
  "cat.heavy-equipment.desc": "Excavators, cranes, industrial machines.",
  "cat.art-collectibles.desc": "Fine art, classics, rare collectibles.",

  "search.title": "Global Search",
  "search.placeholder": "Search anything on the marketplace…",
  "search.category": "Category",
  "search.brand": "Brand",
  "search.model": "Model",
  "search.country": "Country",
  "search.city": "City",
  "search.year": "Year",
  "search.mileage": "Mileage",
  "search.fuel": "Fuel",
  "search.transmission": "Transmission",
  "search.condition": "Condition",
  "search.price": "Price",
  "search.verified": "Verified Seller",
  "search.submit": "Search",
  "search.reset": "Reset",
  "search.any": "Any",

  "featured.title": "Featured Listings",
  "featured.subtitle": "Hand-picked assets from verified sellers.",

  "price.seller": "Seller Price",
  "price.market": "Exchange Market Value",
  "price.gcv": "Community GCV Reference (1 Pi = 314,159 USD)",
  "price.notice":
    "Community GCV Reference (1 Pi = 314,159 USD) is a community ecosystem reference and is NOT an official Pi Network exchange rate.",
  "price.disclaimer":
    "Community GCV Reference (1 Pi = 314,159 USD) is a community ecosystem reference and is NOT an official Pi Network exchange rate.",
  "price.settings": "Pricing Settings",
  "price.gcv.label": "GCV rate (USD per 1 Pi)",
  "price.market.label": "Market rate (USD per 1 Pi)",
  "price.mode": "Pricing mode",
  "price.mode.gcv": "Community GCV Reference",
  "price.mode.market": "Exchange Market Value",
  "price.mode.market.short": "Market",

  "footer.tagline": "The premium global marketplace for the Pi Network ecosystem.",
  "footer.rights": "All rights reserved.",
  "footer.company": "Company",
  "footer.legal": "Legal",
  "footer.resources": "Resources",

  "cta.verified": "Verified",
  "cta.new": "New",
};

const partial = (overrides: Dict): Dict => ({ ...en, ...overrides });

const dictionaries: Record<LangCode, Dict> = {
  en,
  tr: partial({
    "nav.marketplace": "Pazar", "nav.sell": "Sat", "nav.categories": "Kategoriler",
    "nav.about": "Hakkında", "nav.wallet": "Pi Cüzdanı Bağla",

    "hero.title": "Pi Global Pazar",
    "hero.subtitle": "Tek Pazar. Sınırsız İmkan. Pi ile Güçlendirildi.",
    "hero.browse": "Pazarı Keşfet", "hero.sell": "Ürününü Sat", "hero.wallet": "Pi Cüzdanı Bağla",
    "hero.badge": "Web3 · Pi Network Ekosistemi",

    "categories.title": "Kategorileri Keşfet",
    "categories.subtitle": "Her varlık sınıfı için özenle seçilmiş pazarlar.",
    "cat.vehicles": "Araçlar", "cat.electronics": "Elektronik",
    "cat.realestate": "Emlak", "cat.luxury": "Lüks", "cat.services": "Hizmetler",
    "cat.motorcycles": "Motosikletler", "cat.boats": "Tekneler & Yatlar",
    "cat.trucks": "Kamyonlar", "cat.heavy-equipment": "İş Makineleri",
    "cat.art-collectibles": "Sanat & Koleksiyon",
    "cat.vehicles.desc": "Otomobiller, SUV'lar, elektrikli ve performans araçları.",
    "cat.electronics.desc": "Telefonlar, dizüstü bilgisayarlar, kameralar, ses sistemleri.",
    "cat.realestate.desc": "Evler, çatı katları, villalar, arsalar.",
    "cat.luxury.desc": "Saatler, mücevherler, moda, koleksiyon parçaları.",
    "cat.services.desc": "Profesyonel ve dijital hizmetler.",
    "cat.motorcycles.desc": "Spor, tur ve macera motosikletleri.",
    "cat.boats.desc": "Yatlar, süperyatlar, motorbotlar.",
    "cat.trucks.desc": "Ağır kamyonlar ve ticari filo.",
    "cat.heavy-equipment.desc": "Ekskavatörler, vinçler, endüstriyel makineler.",
    "cat.art-collectibles.desc": "Güzel sanatlar, klasikler, nadir koleksiyon parçaları.",

    "search.title": "Global Arama",
    "search.placeholder": "Pazarda herhangi bir şey ara…",
    "search.category": "Kategori", "search.brand": "Marka", "search.model": "Model",
    "search.country": "Ülke", "search.city": "Şehir", "search.year": "Yıl",
    "search.mileage": "Kilometre", "search.fuel": "Yakıt", "search.transmission": "Vites",
    "search.condition": "Durum", "search.price": "Fiyat", "search.verified": "Doğrulanmış Satıcı",
    "search.submit": "Ara", "search.reset": "Sıfırla", "search.any": "Herhangi",

    "featured.title": "Öne Çıkan İlanlar",
    "featured.subtitle": "Doğrulanmış satıcılardan özenle seçilmiş ürünler.",

    "price.seller": "Satıcı Fiyatı", "price.market": "Borsa Değeri",
    "price.gcv": "Topluluk Ekosistem Referansı (1 Pi = 314.159 USD)",
    "price.notice":
      "Topluluk Ekosistem Referansı (1 Pi = 314.159 USD) bir topluluk referans değeridir ve resmi Pi Network kuru DEĞİLDİR.",
    "price.disclaimer":
      "Topluluk Ekosistem Referansı (1 Pi = 314.159 USD) bir topluluk referans değeridir ve resmi Pi Network kuru değildir.",
    "price.settings": "Fiyatlandırma Ayarları",
    "price.gcv.label": "GCV oranı (1 Pi başına USD)",
    "price.market.label": "Piyasa oranı (1 Pi başına USD)",
    "price.mode": "Fiyatlandırma modu",
    "price.mode.gcv": "Topluluk GCV Referansı",
    "price.mode.market": "Borsa Değeri",
    "price.mode.market.short": "Piyasa",

    "footer.tagline": "Pi Network ekosistemi için premium global pazar yeri.",
    "footer.rights": "Tüm hakları saklıdır.",
    "footer.company": "Şirket", "footer.legal": "Yasal", "footer.resources": "Kaynaklar",

    "cta.verified": "Doğrulanmış", "cta.new": "Yeni",
  }),
  de: partial({
    "hero.title": "Pi Globaler Marktplatz",
    "hero.subtitle": "Ein Marktplatz. Unbegrenzte Möglichkeiten. Angetrieben von Pi.",
    "hero.browse": "Marktplatz erkunden", "hero.sell": "Produkt verkaufen", "hero.wallet": "Pi-Wallet verbinden",
    "cat.vehicles": "Fahrzeuge", "cat.electronics": "Elektronik", "cat.realestate": "Immobilien",
    "cat.luxury": "Luxus", "cat.services": "Dienstleistungen",
  }),
  fr: partial({
    "hero.title": "Pi Marché Mondial",
    "hero.subtitle": "Un marché. Des possibilités illimitées. Propulsé par Pi.",
    "hero.browse": "Explorer le marché", "hero.sell": "Vendre votre produit", "hero.wallet": "Connecter le portefeuille Pi",
    "cat.vehicles": "Véhicules", "cat.electronics": "Électronique", "cat.realestate": "Immobilier",
    "cat.luxury": "Luxe", "cat.services": "Services",
  }),
  es: partial({
    "hero.title": "Pi Mercado Global",
    "hero.subtitle": "Un mercado. Posibilidades ilimitadas. Impulsado por Pi.",
    "hero.browse": "Explorar mercado", "hero.sell": "Vende tu producto", "hero.wallet": "Conectar Pi Wallet",
    "cat.vehicles": "Vehículos", "cat.electronics": "Electrónica", "cat.realestate": "Inmuebles",
    "cat.luxury": "Lujo", "cat.services": "Servicios",
  }),
  it: partial({
    "hero.title": "Pi Mercato Globale",
    "hero.subtitle": "Un mercato. Possibilità illimitate. Alimentato da Pi.",
    "hero.browse": "Esplora il mercato", "hero.sell": "Vendi il tuo prodotto", "hero.wallet": "Collega Pi Wallet",
    "cat.vehicles": "Veicoli", "cat.electronics": "Elettronica", "cat.realestate": "Immobili",
    "cat.luxury": "Lusso", "cat.services": "Servizi",
  }),
  pt: partial({
    "hero.title": "Pi Mercado Global",
    "hero.subtitle": "Um mercado. Possibilidades ilimitadas. Impulsionado por Pi.",
    "hero.browse": "Explorar mercado", "hero.sell": "Vender produto", "hero.wallet": "Conectar Pi Wallet",
    "cat.vehicles": "Veículos", "cat.electronics": "Eletrônicos", "cat.realestate": "Imóveis",
    "cat.luxury": "Luxo", "cat.services": "Serviços",
  }),
  nl: partial({
    "hero.title": "Pi Wereldwijde Marktplaats",
    "hero.subtitle": "Eén marktplaats. Onbeperkte mogelijkheden. Aangedreven door Pi.",
    "hero.browse": "Marktplaats verkennen", "hero.sell": "Verkoop je product", "hero.wallet": "Pi Wallet verbinden",
    "cat.vehicles": "Voertuigen", "cat.electronics": "Elektronica", "cat.realestate": "Vastgoed",
    "cat.luxury": "Luxe", "cat.services": "Diensten",
  }),
  ru: partial({
    "hero.title": "Pi Глобальный Маркетплейс",
    "hero.subtitle": "Один маркетплейс. Безграничные возможности. На технологии Pi.",
    "hero.browse": "Обзор маркетплейса", "hero.sell": "Продать товар", "hero.wallet": "Подключить Pi Кошелёк",
    "cat.vehicles": "Транспорт", "cat.electronics": "Электроника", "cat.realestate": "Недвижимость",
    "cat.luxury": "Люкс", "cat.services": "Услуги",
  }),
  ar: partial({
    "hero.title": "بي السوق العالمي",
    "hero.subtitle": "سوق واحد. إمكانيات لا حدود لها. مدعوم من Pi.",
    "hero.browse": "تصفح السوق", "hero.sell": "بيع منتجك", "hero.wallet": "اربط محفظة Pi",
    "cat.vehicles": "المركبات", "cat.electronics": "الإلكترونيات", "cat.realestate": "العقارات",
    "cat.luxury": "الفخامة", "cat.services": "الخدمات",
    "price.disclaimer":
      "قيمة المجتمع المرجعية (GCV) هي قيمة مرجعية مجتمعية وليست سعر صرف رسمي لشبكة Pi.",
  }),
  zh: partial({
    "hero.title": "Pi 全球市场",
    "hero.subtitle": "一个市场。无限可能。由 Pi 驱动。",
    "hero.browse": "浏览市场", "hero.sell": "出售商品", "hero.wallet": "连接 Pi 钱包",
    "cat.vehicles": "车辆", "cat.electronics": "电子产品", "cat.realestate": "房地产",
    "cat.luxury": "奢华", "cat.services": "服务",
  }),
  ja: partial({
    "hero.title": "Pi グローバルマーケットプレイス",
    "hero.subtitle": "ひとつのマーケット。無限の可能性。Pi によって支えられる。",
    "hero.browse": "マーケットを見る", "hero.sell": "商品を出品", "hero.wallet": "Pi ウォレット接続",
    "cat.vehicles": "乗り物", "cat.electronics": "電子機器", "cat.realestate": "不動産",
    "cat.luxury": "ラグジュアリー", "cat.services": "サービス",
  }),
  ko: partial({
    "hero.title": "Pi 글로벌 마켓플레이스",
    "hero.subtitle": "하나의 마켓. 무한한 가능성. Pi로 구동됩니다.",
    "hero.browse": "마켓 둘러보기", "hero.sell": "상품 판매", "hero.wallet": "Pi 지갑 연결",
    "cat.vehicles": "차량", "cat.electronics": "전자제품", "cat.realestate": "부동산",
    "cat.luxury": "럭셔리", "cat.services": "서비스",
  }),
};

type I18nCtx = {
  lang: LangCode;
  setLang: (l: LangCode) => void;
  t: (key: string) => string;
  dir: "ltr" | "rtl";
};

const I18nContext = createContext<I18nCtx | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<LangCode>("en");

  useEffect(() => {
    try {
      const saved = localStorage.getItem("pigm.lang") as LangCode | null;
      if (saved && dictionaries[saved]) setLangState(saved);
    } catch {}
  }, []);

  const setLang = (l: LangCode) => {
    setLangState(l);
    try { localStorage.setItem("pigm.lang", l); } catch {}
  };

  const dir = LANGS.find((l) => l.code === lang)?.rtl ? "rtl" : "ltr";

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.setAttribute("lang", lang);
      document.documentElement.setAttribute("dir", dir);
    }
  }, [lang, dir]);

  const value = useMemo<I18nCtx>(
    () => ({
      lang,
      setLang,
      dir,
      t: (key) => dictionaries[lang]?.[key] ?? en[key] ?? key,
    }),
    [lang, dir],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside I18nProvider");
  return ctx;
}
