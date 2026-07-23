import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AccountLayout } from "@/components/AccountLayout";
import type { Profile } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard · Pi Global Marketplace" },
      { name: "description", content: "Manage your Pi Global Marketplace account, listings, messages and favorites." },
      { property: "og:title", content: "Dashboard · Pi Global Marketplace" },
      { property: "og:description", content: "Your Pi Global Marketplace command center." },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const { data: profile } = useQuery({
    queryKey: ["me-profile"],
    queryFn: async (): Promise<Profile | null> => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return null;
      const { data } = await supabase.from("profiles").select("*").eq("id", u.user.id).maybeSingle();
      return data as Profile | null;
    },
  });

  const completion = calcCompletion(profile);

  return (
    <AccountLayout title="Dashboard">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <div className="glass rounded-2xl p-6 border border-gold/20 md:col-span-2 xl:col-span-2">
          <p className="text-xs uppercase tracking-widest text-gold">Welcome back</p>
          <h2 className="font-display text-2xl sm:text-3xl mt-1">
            {profile?.full_name || profile?.username || "New member"}
          </h2>
          <p className="text-sm text-silver/70 mt-2">
            One Marketplace. Unlimited Possibilities. Powered by Pi.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link to="/sell" className="btn-gold rounded-full px-4 py-2 text-sm">List an item</Link>
            <Link to="/marketplace" className="btn-ghost-silver rounded-full px-4 py-2 text-sm">Browse marketplace</Link>
          </div>
        </div>

        <Card title="Profile completion">
          <div className="flex items-end justify-between">
            <span className="font-display text-4xl text-gradient-gold">{completion}%</span>
            <Link to="/profile" className="text-xs text-gold hover:underline">Complete →</Link>
          </div>
          <div className="mt-3 h-2 rounded-full bg-white/5 overflow-hidden">
            <div className="h-full bg-gradient-to-r from-gold to-gold-soft" style={{ width: `${completion}%` }} />
          </div>
        </Card>

        <Stat label="Profile" value={`${completion}%`} hint="Complete your profile" href="/profile" />
        <Stat label="Marketplace" value="Live" hint="Browse featured listings" href="/marketplace" />
        <Stat label="Sell" value="Ready" hint="Create your first listing" href="/sell" />
        <Stat label="Settings" value="⚙" hint="Security & preferences" href="/settings" />
        <Stat label="Verification" value={profile?.verified ? "Verified" : "Pending"} hint="Trusted-seller badge" href="/profile" />
        <Stat label="Language" value={(profile?.language ?? "en").toUpperCase()} hint="Change in settings" href="/settings" />
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <Card title="Wallet overview">
          <p className="text-sm text-silver/70">Pi Wallet connects inside the Pi Browser.</p>
          <button className="mt-3 btn-ghost-silver rounded-full px-4 py-2 text-xs">Connect Pi Wallet</button>
        </Card>
        <Card title="Account status">
          <div className="flex items-center gap-3">
            <span className={`h-8 w-8 grid place-items-center rounded-full ${profile?.verified ? "bg-emerald-500/20 text-emerald-300" : "bg-white/5 text-silver/60"}`}>✓</span>
            <div>
              <p className="text-sm">{profile?.verified ? "Verified account" : "Unverified"}</p>
              <p className="text-xs text-silver/60">
                {profile?.verified ? "Trusted seller badge active" : "Complete profile to request verification"}
              </p>
            </div>
          </div>
        </Card>
      </div>
    </AccountLayout>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="glass rounded-2xl p-5 border border-white/10">
      <p className="text-xs uppercase tracking-widest text-silver/60">{title}</p>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function Stat({ label, value, hint, href }: { label: string; value: string; hint: string; href: string }) {
  return (
    <Link to={href} className="glass rounded-2xl p-5 border border-white/10 hover:border-gold/30 transition group">
      <p className="text-xs uppercase tracking-widest text-silver/60">{label}</p>
      <p className="font-display text-3xl text-gradient-gold mt-1">{value}</p>
      <p className="text-xs text-silver/60 mt-2 group-hover:text-silver">{hint} →</p>
    </Link>
  );
}

function calcCompletion(p: Profile | null | undefined): number {
  if (!p) return 0;
  const fields: (keyof Profile)[] = ["full_name", "username", "phone", "country", "city", "biography", "avatar_url"];
  const filled = fields.filter((f) => !!p[f]).length;
  return Math.round((filled / fields.length) * 100);
}
