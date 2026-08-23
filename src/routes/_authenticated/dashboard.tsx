import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AccountLayout } from "@/components/AccountLayout";
import type { Profile } from "@/lib/auth";
import { GCV_USD_PER_PI } from "@/lib/pricing";
import { useI18n } from "@/lib/i18n";

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
  const { t } = useI18n();
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
    <AccountLayout title={t("dash.title")}>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <div className="glass rounded-2xl p-6 border border-gold/20 md:col-span-2 xl:col-span-2">
          <p className="text-xs uppercase tracking-widest text-gold">{t("dash.welcome")}</p>
          <h2 className="font-display text-2xl sm:text-3xl mt-1">
            {profile?.full_name || profile?.username || t("dash.newMember")}
          </h2>
          <p className="text-sm text-silver/70 mt-2">
            {t("hero.subtitle")}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link to="/listings/new" className="btn-gold rounded-full px-4 py-2 text-sm">＋ {t("dash.newListing")}</Link>
            <Link to="/listings" className="btn-ghost-silver rounded-full px-4 py-2 text-sm">{t("dash.myListings")}</Link>
            <Link to="/marketplace" className="btn-ghost-silver rounded-full px-4 py-2 text-sm">{t("hero.browse")}</Link>
          </div>
        </div>

        <div className="glass rounded-2xl p-5 border border-white/10">
          <p className="text-xs uppercase tracking-widest text-silver/60">{t("dash.profileCompletion")}</p>
          <div className="mt-3 flex items-end justify-between">
            <span className="font-display text-4xl text-gradient-gold">{completion}%</span>
            <Link to="/profile" className="text-xs text-gold hover:underline">{t("dash.complete")} →</Link>
          </div>
          <div className="mt-3 h-2 rounded-full bg-white/5 overflow-hidden">
            <div className="h-full bg-gradient-to-r from-gold to-gold-soft" style={{ width: `${completion}%` }} />
          </div>
        </div>

        <Stat label={t("dash.activeListings")} value={data?.listingsActive ?? 0} hint={t("dash.liveOnMarketplace")} href="/listings" />
        <Stat label={t("dash.drafts")} value={data?.listingsDraft ?? 0} hint={t("dash.continueEditing")} href="/listings?status=draft" />
        <Stat label={t("dash.reserved")} value={data?.listingsReserved ?? 0} hint={t("dash.heldWithPi")} href="/listings?status=reserved" />
        <Stat label={t("dash.sold")} value={data?.listingsSold ?? 0} hint={t("dash.completedDeals")} href="/listings?status=sold" />
        <Stat label={t("dash.totalViews")} value={data?.totalViews ?? 0} hint={t("dash.acrossAllListings")} href="/analytics" />
        <Stat label={t("dash.offersReceived")} value={data?.offersReceived ?? 0} hint={t("dash.pendingResponse")} href="/offers" />
        <Stat label={t("dash.offersSent")} value={data?.offersSent ?? 0} hint={t("dash.awaitingSeller")} href="/offers?tab=sent" />
        <Stat label={t("dash.orders")} value={data?.orders ?? 0} hint={t("dash.buySellActivity")} href="/orders" />
        <Stat label={t("dash.messages")} value={data?.unreadMessages ?? 0} hint={t("dash.unreadInbox")} href="/messages" />
        <Stat label={t("dash.notifications")} value={data?.unreadNotifications ?? 0} hint={t("dash.unreadAlerts")} href="/notifications" />
        <Stat label={t("dash.favorites")} value={data?.favorites ?? 0} hint={t("dash.savedItems")} href="/favorites" />
        <Stat label={t("dash.verification")} value={profile?.verified ? t("dash.verified") : t("dash.pending")} hint={t("dash.trustedBadge")} href="/verification" />
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="glass rounded-2xl p-5 border border-gold/20">
          <p className="text-xs uppercase tracking-widest text-gold">{t("dash.walletOverview")}</p>
          <p className="mt-2 font-display text-2xl">Pi Wallet</p>
          <p className="text-xs text-silver/60 mt-1">
            {t("dash.walletHint")}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link to="/wallet" className="btn-gold rounded-full px-4 py-2 text-xs">{t("dash.openWallet")}</Link>
            <button className="btn-ghost-silver rounded-full px-4 py-2 text-xs">{t("hero.wallet")}</button>
          </div>
          <p className="mt-3 text-[10px] text-silver/50">
            {t("dash.gcvReference")}: 1 π = {GCV_USD_PER_PI.toLocaleString()} USD
          </p>
        </div>
        <div className="glass rounded-2xl p-5 border border-white/10">
          <p className="text-xs uppercase tracking-widest text-silver/60">{t("dash.accountStatus")}</p>
          <div className="mt-3 flex items-center gap-3">
            <span className={`h-8 w-8 grid place-items-center rounded-full ${profile?.verified ? "bg-emerald-500/20 text-emerald-300" : "bg-white/5 text-silver/60"}`}>✓</span>
            <div>
              <p className="text-sm">{profile?.verified ? t("dash.verifiedSeller") : t("dash.unverified")}</p>
              <p className="text-xs text-silver/60">
                {profile?.verified ? t("dash.trustedActive") : t("dash.submitId")}
              </p>
            </div>
            <Link to="/verification" className="ml-auto text-xs text-gold hover:underline">{t("dash.manage")} →</Link>
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
