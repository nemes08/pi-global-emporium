import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AccountLayout } from "@/components/AccountLayout";
import type { Profile } from "@/lib/auth";
import { GCV_USD_PER_PI } from "@/lib/pricing";

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
  const { data } = useQuery({
    queryKey: ["dashboard-summary"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return null;
      const uid = u.user.id;
      const [
        profileRes,
        listingsRes,
        favRes,
        msgRes,
        notifRes,
        ordersRes,
        offersReceivedRes,
        offersSentRes,
      ] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", uid).maybeSingle(),
        supabase.from("listings").select("id,status,views_count", { count: "exact" }).eq("seller_id", uid),
        supabase.from("favorites").select("listing_id", { count: "exact", head: true }).eq("user_id", uid),
        supabase.from("messages").select("id", { count: "exact", head: true }).is("read_at", null).neq("sender_id", uid),
        supabase.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", uid).is("read_at", null),
        supabase.from("orders").select("id", { count: "exact", head: true }).or(`buyer_id.eq.${uid},seller_id.eq.${uid}`),
        supabase.from("offers").select("id", { count: "exact", head: true }).eq("seller_id", uid).eq("status", "pending"),
        supabase.from("offers").select("id", { count: "exact", head: true }).eq("buyer_id", uid).eq("status", "pending"),
      ]);
      const listings = listingsRes.data ?? [];
      const totalViews = listings.reduce((s, l: { views_count: number }) => s + (l.views_count ?? 0), 0);
      return {
        profile: profileRes.data as Profile | null,
        listingsTotal: listings.length,
        listingsActive: listings.filter((l: { status: string }) => l.status === "active").length,
        listingsDraft: listings.filter((l: { status: string }) => l.status === "draft").length,
        listingsSold: listings.filter((l: { status: string }) => l.status === "sold").length,
        listingsReserved: listings.filter((l: { status: string }) => l.status === "reserved").length,
        totalViews,
        favorites: favRes.count ?? 0,
        unreadMessages: msgRes.count ?? 0,
        unreadNotifications: notifRes.count ?? 0,
        orders: ordersRes.count ?? 0,
        offersReceived: offersReceivedRes.count ?? 0,
        offersSent: offersSentRes.count ?? 0,
      };
    },
  });

  const profile = data?.profile;
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
            <Link to="/listings/new" className="btn-gold rounded-full px-4 py-2 text-sm">＋ New listing</Link>
            <Link to="/listings" className="btn-ghost-silver rounded-full px-4 py-2 text-sm">My listings</Link>
            <Link to="/marketplace" className="btn-ghost-silver rounded-full px-4 py-2 text-sm">Browse marketplace</Link>
          </div>
        </div>

        <div className="glass rounded-2xl p-5 border border-white/10">
          <p className="text-xs uppercase tracking-widest text-silver/60">Profile completion</p>
          <div className="mt-3 flex items-end justify-between">
            <span className="font-display text-4xl text-gradient-gold">{completion}%</span>
            <Link to="/profile" className="text-xs text-gold hover:underline">Complete →</Link>
          </div>
          <div className="mt-3 h-2 rounded-full bg-white/5 overflow-hidden">
            <div className="h-full bg-gradient-to-r from-gold to-gold-soft" style={{ width: `${completion}%` }} />
          </div>
        </div>

        <Stat label="Active listings" value={data?.listingsActive ?? 0} hint="Live on marketplace" href="/listings" />
        <Stat label="Drafts" value={data?.listingsDraft ?? 0} hint="Continue editing" href="/listings?status=draft" />
        <Stat label="Reserved" value={data?.listingsReserved ?? 0} hint="Held with Pi" href="/listings?status=reserved" />
        <Stat label="Sold" value={data?.listingsSold ?? 0} hint="Completed deals" href="/listings?status=sold" />
        <Stat label="Total views" value={data?.totalViews ?? 0} hint="Across all listings" href="/analytics" />
        <Stat label="Offers received" value={data?.offersReceived ?? 0} hint="Pending your response" href="/offers" />
        <Stat label="Offers sent" value={data?.offersSent ?? 0} hint="Awaiting seller" href="/offers?tab=sent" />
        <Stat label="Orders" value={data?.orders ?? 0} hint="Buy / sell activity" href="/orders" />
        <Stat label="Messages" value={data?.unreadMessages ?? 0} hint="Unread in inbox" href="/messages" />
        <Stat label="Notifications" value={data?.unreadNotifications ?? 0} hint="Unread alerts" href="/notifications" />
        <Stat label="Favorites" value={data?.favorites ?? 0} hint="Saved items" href="/favorites" />
        <Stat label="Verification" value={profile?.verified ? "Verified" : "Pending"} hint="Trusted-seller badge" href="/verification" />
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="glass rounded-2xl p-5 border border-gold/20">
          <p className="text-xs uppercase tracking-widest text-gold">Wallet overview</p>
          <p className="mt-2 font-display text-2xl">Pi Wallet</p>
          <p className="text-xs text-silver/60 mt-1">
            Connect inside Pi Browser to enable Buy Now, Reserve with Pi and payouts.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link to="/wallet" className="btn-gold rounded-full px-4 py-2 text-xs">Open wallet</Link>
            <button className="btn-ghost-silver rounded-full px-4 py-2 text-xs">Connect Pi Wallet</button>
          </div>
          <p className="mt-3 text-[10px] text-silver/50">
            Community GCV Reference: 1 π = {GCV_USD_PER_PI.toLocaleString()} USD
          </p>
        </div>
        <div className="glass rounded-2xl p-5 border border-white/10">
          <p className="text-xs uppercase tracking-widest text-silver/60">Account status</p>
          <div className="mt-3 flex items-center gap-3">
            <span className={`h-8 w-8 grid place-items-center rounded-full ${profile?.verified ? "bg-emerald-500/20 text-emerald-300" : "bg-white/5 text-silver/60"}`}>✓</span>
            <div>
              <p className="text-sm">{profile?.verified ? "Verified seller" : "Unverified"}</p>
              <p className="text-xs text-silver/60">
                {profile?.verified ? "Trusted seller badge active" : "Submit ID to request verification"}
              </p>
            </div>
            <Link to="/verification" className="ml-auto text-xs text-gold hover:underline">Manage →</Link>
          </div>
        </div>
      </div>
    </AccountLayout>
  );
}

function Stat({ label, value, hint, href }: { label: string; value: number | string; hint: string; href: string }) {
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
  const fields: (keyof Profile)[] = ["full_name", "username", "country", "city", "biography", "avatar_url"];
  const filled = fields.filter((f) => !!p[f]).length;
  return Math.round((filled / fields.length) * 100);
}
