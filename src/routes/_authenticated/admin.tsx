import { createFileRoute, Link, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { useAuth } from "@/lib/auth";
import { isAdminUser } from "@/lib/admin";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Admin Console · Pi Global Marketplace" },
      { name: "description", content: "Internal administration console for Pi Global Marketplace operators." },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "Admin Console · Pi Global Marketplace" },
      { property: "og:description", content: "Internal administration console." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminLayout,
});

const ADMIN_NAV = [
  { to: "/admin", label: "Overview", icon: "◈", exact: true },
  { to: "/admin/users", label: "Users & Dealers", icon: "◔" },
  { to: "/admin/verification", label: "Verification Queue", icon: "✓" },
  { to: "/admin/listings", label: "Listings", icon: "▤" },
  { to: "/admin/orders", label: "Orders & Escrow", icon: "⛨" },
  { to: "/admin/moderation", label: "Reviews & Reports", icon: "⚖" },
  { to: "/admin/logs", label: "Activity Logs", icon: "≡" },
];

function AdminLayout() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const { data: allowed, isPending } = useQuery({
    queryKey: ["is-admin", user?.id],
    queryFn: () => isAdminUser(user?.id),
    enabled: !!user?.id,
    staleTime: 60_000,
  });

  if (isPending) {
    return (
      <div className="min-h-dvh flex flex-col">
        <Navbar />
        <main className="flex-1 mx-auto w-full max-w-7xl px-4 py-16 sm:px-6" aria-busy="true">
          <div className="glass h-40 animate-pulse rounded-3xl border border-white/10" />
        </main>
        <Footer />
      </div>
    );
  }

  if (!allowed) {
    return (
      <div className="min-h-dvh flex flex-col">
        <Navbar />
        <main className="flex-1 mx-auto w-full max-w-3xl px-4 py-20 sm:px-6">
          <div className="glass rounded-3xl border border-white/10 p-12 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-red-500/30 bg-red-500/10 text-3xl">
              ⛔
            </div>
            <h1 className="mt-5 font-display text-3xl text-white">Administrator access required</h1>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
              This console is restricted to platform administrators. If you believe you should have access, contact the
              platform owner.
            </p>
            <button onClick={() => navigate({ to: "/dashboard" })} className="btn-gold mt-6 rounded-full px-6 py-2.5 text-xs">
              Back to dashboard
            </button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-dvh flex flex-col">
      <Navbar />
      <main className="flex-1 mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
        <div className="grid gap-6 md:grid-cols-[240px_1fr]">
          <aside className="glass h-fit rounded-2xl border border-white/10 p-3 md:sticky md:top-24">
            <p className="px-3 pb-2 pt-1 text-[10px] uppercase tracking-widest text-gold/80">Admin Console</p>
            <nav aria-label="Admin sections" className="flex gap-1 overflow-x-auto md:flex-col md:overflow-visible">
              {ADMIN_NAV.map((item) => {
                const active = item.exact ? location.pathname === item.to : location.pathname.startsWith(item.to);
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={`flex items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-sm transition ${
                      active ? "border border-gold/30 bg-gold/15 text-white" : "text-silver/80 hover:bg-white/5"
                    }`}
                  >
                    <span aria-hidden="true" className="w-4 text-center text-gold">{item.icon}</span>
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </aside>
          <section className="min-w-0">
            <Outlet />
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
