import { Link, useNavigate, useLocation } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { useAuth } from "@/lib/auth";

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: "◈" },
  { to: "/profile", label: "Profile", icon: "◔" },
  { to: "/settings", label: "Settings", icon: "⚙" },
] as const;

export function AccountLayout({ children, title }: { children: ReactNode; title?: string }) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  async function handleSignOut() {
    await signOut();
    navigate({ to: "/", replace: true });
  }

  return (
    <div className="min-h-dvh flex flex-col">
      <Navbar />
      <main className="flex-1 mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
        <div className="grid gap-6 md:grid-cols-[240px_1fr]">
          <aside className="glass rounded-2xl border border-white/10 p-3 h-fit md:sticky md:top-24">
            <div className="px-3 py-3 border-b border-white/10 mb-2">
              <p className="text-xs text-silver/60">Signed in as</p>
              <p className="text-sm font-medium text-white truncate">{user?.email}</p>
            </div>
            <nav className="flex md:flex-col gap-1 overflow-x-auto md:overflow-visible">
              {NAV.map((item) => {
                const active = location.pathname === item.to || location.pathname.startsWith(item.to + "/");
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm whitespace-nowrap transition ${
                      active ? "bg-gold/15 text-white border border-gold/30" : "text-silver/80 hover:bg-white/5"
                    }`}
                  >
                    <span className="text-gold">{item.icon}</span>
                    {item.label}
                  </Link>
                );
              })}
              <button
                onClick={handleSignOut}
                className="mt-2 flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-silver/80 hover:bg-red-500/10 hover:text-red-300 text-left"
              >
                <span>⏻</span> Sign out
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
