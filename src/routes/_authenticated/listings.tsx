import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AccountLayout } from "@/components/AccountLayout";
import { GCV_USD_PER_PI, usePricing } from "@/lib/pricing";
import { CATEGORY_LABELS, type CategoryKey } from "@/lib/catalog";
import { STATUS_LABEL, STATUS_TONE, signMediaUrl, type ListingRow, type ListingStatus } from "@/lib/listings";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/listings")({
  head: () => ({
    meta: [
      { title: "My Listings · Pi Global Marketplace" },
      { name: "description", content: "Manage your listings on Pi Global Marketplace — drafts, active, reserved and sold items." },
      { property: "og:title", content: "My Listings · Pi Global Marketplace" },
      { property: "og:description", content: "Create, edit and track your listings in one premium dashboard." },
    ],
  }),
  component: MyListings,
});

const TAB_KEYS: { key: "all" | ListingStatus; label: string }[] = [
  { key: "all", label: "listings.all" },
  { key: "active", label: "dash.activeListings" },
  { key: "draft", label: "dash.drafts" },
  { key: "reserved", label: "dash.reserved" },
  { key: "sold", label: "dash.sold" },
  { key: "archived", label: "listings.archived" },
];

function MyListings() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const [tab, setTab] = useState<"all" | ListingStatus>("all");
  const { usdPerPi } = usePricing();

  const { data: listings, isLoading } = useQuery({
    queryKey: ["my-listings"],
    queryFn: async (): Promise<ListingRow[]> => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return [];
      const { data, error } = await supabase.from("listings").select("*").eq("seller_id", u.user.id).order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ListingRow[];
    },
  });

  const filtered = useMemo(() => {
    if (!listings) return [];
    if (tab === "all") return listings;
    return listings.filter((l) => l.status === tab);
  }, [listings, tab]);

  async function updateStatus(id: string, status: ListingStatus) {
    await supabase.from("listings").update({ status }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["my-listings"] });
    qc.invalidateQueries({ queryKey: ["dashboard-summary"] });
  }

  async function remove(id: string) {
    if (!confirm("Delete this listing? This cannot be undone.")) return;
    await supabase.from("listings").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["my-listings"] });
    qc.invalidateQueries({ queryKey: ["dashboard-summary"] });
  }

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: listings?.length ?? 0 };
    for (const s of ["draft", "active", "reserved", "sold", "archived"] as ListingStatus[]) {
      c[s] = listings?.filter((l) => l.status === s).length ?? 0;
    }
    return c;
  }, [listings]);

  return (
    <AccountLayout title={t("dash.myListings")}>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div className="flex flex-wrap gap-2">
          {TAB_KEYS.map((tab_) => (
            <button
              key={tab_.key}
              onClick={() => setTab(tab_.key)}
              className={`rounded-full px-4 py-1.5 text-xs font-medium border transition ${
                tab === tab_.key ? "btn-gold text-onyx border-transparent" : "border-white/10 text-silver/80 hover:border-gold/30"
              }`}
            >
              {t(tab_.label)}<span className="ml-1.5 opacity-60">{counts[tab_.key] ?? 0}</span>
            </button>
          ))}
        </div>
        <Link to="/listings/new" className="btn-gold rounded-full px-5 py-2 text-sm">＋ {t("dash.newListing")}</Link>
      </div>

      {isLoading ? (
        <div className="text-sm text-silver/60">{t("listings.loading")}</div>
      ) : filtered.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((l) => (
            <ListingCardOwn key={l.id} listing={l} usdPerPi={usdPerPi} onStatus={updateStatus} onDelete={remove} />
          ))}
        </div>
      )}
    </AccountLayout>
  );
}

function EmptyState() {
  const { t } = useI18n();
  return (
    <div className="glass rounded-2xl p-10 text-center border border-white/10">
      <div className="text-4xl">✧</div>
      <h3 className="font-display text-2xl mt-2 text-gradient-gold">{t("listings.noneYet")}</h3>
      <p className="text-sm text-silver/70 mt-1">{t("listings.createFirst")}</p>
      <Link to="/listings/new" className="mt-4 inline-flex btn-gold rounded-full px-5 py-2 text-sm">＋ {t("listings.createListing")}</Link>
    </div>
  );
}

function ListingCardOwn({
  listing,
  usdPerPi,
  onStatus,
  onDelete,
}: {
  listing: ListingRow;
  usdPerPi: number;
  onStatus: (id: string, s: ListingStatus) => void;
  onDelete: (id: string) => void;
}) {
  const { t } = useI18n();
  const [cover, setCover] = useState<string | null>(null);
  useEffect(() => { signMediaUrl(listing.cover_image).then(setCover); }, [listing.cover_image]);
  const pi = listing.price_usd / usdPerPi;
  return (
    <article className="glass rounded-2xl border border-white/10 overflow-hidden group">
      <div className="relative aspect-[16/10] bg-black/40 overflow-hidden">
        {cover ? (
          <img src={cover} alt={listing.title} className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500" />
        ) : (
          <div className="h-full w-full grid place-items-center text-4xl text-silver/40">🖼️</div>
        )}
        <span className={`absolute top-2 left-2 rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-widest ${STATUS_TONE[listing.status]}`}>
          {STATUS_LABEL[listing.status]}
        </span>
        <span className="absolute top-2 right-2 rounded-full bg-black/60 border border-white/10 px-2.5 py-1 text-[10px] text-silver">
          👁 {listing.views_count}
        </span>
      </div>
      <div className="p-4 space-y-2">
        <p className="text-[10px] uppercase tracking-widest text-silver/60">{CATEGORY_LABELS[listing.category as CategoryKey] ?? listing.category}</p>
        <h3 className="font-display text-lg text-white truncate">{listing.title}</h3>
        <p className="text-xs text-silver/60">
          {listing.city || "—"}{listing.country ? `, ${listing.country}` : ""}
        </p>
        <div className="flex items-baseline justify-between pt-2">
          <span className="font-display text-xl text-gradient-gold">{pi.toLocaleString(undefined, { maximumFractionDigits: 5 })} π</span>
          <span className="text-xs text-silver/60">${listing.price_usd.toLocaleString()}</span>
        </div>
        <div className="flex flex-wrap gap-2 pt-3 border-t border-white/5">
          <Link to="/listings/$id/edit" params={{ id: listing.id }} className="btn-ghost-silver rounded-full px-3 py-1 text-[11px]">{t("listings.edit")}</Link>
          <Link to="/listing/$id" params={{ id: listing.id }} className="btn-ghost-silver rounded-full px-3 py-1 text-[11px]">{t("listings.view")}</Link>
          {listing.status === "draft" && (
            <button onClick={() => onStatus(listing.id, "active")} className="rounded-full px-3 py-1 text-[11px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30">{t("listings.publish")}</button>
          )}
          {listing.status === "active" && (
            <>
              <button onClick={() => onStatus(listing.id, "reserved")} className="rounded-full px-3 py-1 text-[11px] bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500/30">{t("listings.markReserved")}</button>
              <button onClick={() => onStatus(listing.id, "sold")} className="rounded-full px-3 py-1 text-[11px] bg-sky-500/20 text-sky-300 border border-sky-500/30 hover:bg-sky-500/30">{t("listings.markSold")}</button>
            </>
          )}
          {listing.status === "reserved" && (
            <>
              <button onClick={() => onStatus(listing.id, "sold")} className="rounded-full px-3 py-1 text-[11px] bg-sky-500/20 text-sky-300 border border-sky-500/30">{t("listings.markSold")}</button>
              <button onClick={() => onStatus(listing.id, "active")} className="rounded-full px-3 py-1 text-[11px] bg-white/5 text-silver/70 border border-white/10">{t("listings.release")}</button>
            </>
          )}
          {listing.status !== "archived" ? (
            <button onClick={() => onStatus(listing.id, "archived")} className="rounded-full px-3 py-1 text-[11px] bg-white/5 text-silver/70 border border-white/10 hover:bg-white/10">{t("listings.archive")}</button>
          ) : (
            <button onClick={() => onStatus(listing.id, "draft")} className="rounded-full px-3 py-1 text-[11px] bg-white/5 text-silver/70 border border-white/10 hover:bg-white/10">{t("listings.restore")}</button>
          )}
          <button onClick={() => onDelete(listing.id)} className="rounded-full px-3 py-1 text-[11px] bg-red-500/10 text-red-300 border border-red-500/20 hover:bg-red-500/20 ml-auto">{t("listings.delete")}</button>
        </div>
        <p className="text-[9px] text-silver/40 pt-1">
          1 π ≈ {GCV_USD_PER_PI.toLocaleString()} USD (GCV community reference)
        </p>
      </div>
    </article>
  );
}
