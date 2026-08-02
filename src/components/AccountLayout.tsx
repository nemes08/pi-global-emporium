import { Link, useNavigate, useLocation } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { useAuth } from "@/lib/auth";

type NavItem = { to: string; label: string; icon: string };

const NAV_SECTIONS: { title: string; items: NavItem[] }[] = [
  {
    title: "Overview",
    items: [
      { to: "/dashboard", label: "Dashboard", icon: "◈" },
      { to: "/analytics", label: "Analytics", icon: "◉" },
    ],
  },
  {
    title: "Selling",
    items: [
      { to: "/listings", label: "My Listings", icon: "▤" },
      { to: "/listings/new", label: "Add Listing", icon: "＋" },
      { to: "/offers", label: "Offers", icon: "⇄" },
      { to: "/orders", label: "Orders", icon: "⛃" },
      { to: "/verification", label: "Seller Verification", icon: "✓" },
    ],
  },
  {
    title: "Buying",
    items: [
      { to: "/escrow", label: "Pi Escrow", icon: "⛨" },
      { to: "/favorites", label: "Favorites", icon: "♥" },
      { to: "/recently-viewed", label: "Recently Viewed", icon: "◔" },
    ],
  },
  {
    title: "Inbox",
    items: [
      { to: "/messages", label: "Messages", icon: "✉" },
      { to: "/notifications", label: "Notifications", icon: "◎" },
    ],
  },
  {
    title: "Wallet",
    items: [
      { to: "/wallet", label: "Wallet Overview", icon: "π" },
    ],
  },
  {
    title: "Account",
    items: [
      { to: "/profile", label: "Profile", icon: "◔" },
      { to: "/settings", label: "Settings", icon: "⚙" },
    ],
  },
];

export function AccountLayout({ children, title }: { children: ReactNode; title?: string }) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  async function handleSignOut() {
    await signOut();
    navigate({ to: "/", replace: true });
  }

  const isActive = (to: string) => {
    if (to === "/dashboard") return location.pathname === "/dashboard";
    return location.pathname === to || location.pathname.startsWith(to + "/");
  };

  return (
    <div className="min-h-dvh flex flex-col">
      <Navbar />
      <main className="flex-1 mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
        <div className="grid gap-6 md:grid-cols-[260px_1fr]">
          <aside className="glass rounded-2xl border border-white/10 p-3 h-fit md:sticky md:top-24">
            <div className="px-3 py-3 border-b border-white/10 mb-2">
              <p className="text-xs text-silver/60">Signed in as</p>
              <p className="text-sm font-medium text-white truncate">{user?.email}</p>
            </div>
            <nav className="flex md:flex-col gap-1 overflow-x-auto md:overflow-visible">
              {NAV_SECTIONS.map((section) => (
                <div key={section.title} className="md:mb-2 shrink-0 md:shrink md:w-full">
                  <p className="hidden md:block px-3 pt-2 pb-1 text-[10px] uppercase tracking-widest text-silver/40">
                    {section.title}
                  </p>
                  <div className="flex md:flex-col gap-1">
                    {section.items.map((item) => {
                      const active = isActive(item.to);
                      return (
                        <Link
                          key={item.to}
                          to={item.to}
                          className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm whitespace-nowrap transition ${
                            active ? "bg-gold/15 text-white border border-gold/30" : "text-silver/80 hover:bg-white/5"
                          }`}
                        >
                          <span className="text-gold w-4 text-center">{item.icon}</span>
                          {item.label}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
              <button
                onClick={handleSignOut}
                className="mt-2 flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-silver/80 hover:bg-red-500/10 hover:text-red-300 text-left"
              >
                <span className="w-4 text-center">⏻</span> Sign out
              </button>
            </nav>
          </aside>
          <section className="min-w-0">
            {title && <h1 className="font-display text-3xl sm:text-4xl text-gradient-gold mb-6">{title}</h1>}
            {children}
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
