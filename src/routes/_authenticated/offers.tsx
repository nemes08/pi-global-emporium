import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AccountLayout } from "@/components/AccountLayout";
import { usePricing } from "@/lib/pricing";

export const Route = createFileRoute("/_authenticated/offers")({
  head: () => ({
    meta: [
      { title: "Offers · Pi Global Marketplace" },
      { name: "description", content: "Offers you've received and sent on Pi Global Marketplace." },
      { property: "og:title", content: "Offers · Pi Global Marketplace" },
      { property: "og:description", content: "Negotiate premium purchases in Pi." },
    ],
  }),
  component: OffersPage,
});

type OfferRow = {
  id: string;
  listing_id: string;
  buyer_id: string;
  seller_id: string;
  amount_usd: number;
  message: string | null;
  status: "pending" | "accepted" | "rejected" | "withdrawn" | "expired";
  created_at: string;
  listings: { title: string | null; price_usd: number } | null;
};

function OffersPage() {
  const qc = useQueryClient();
  const { usdPerPi } = usePricing();
  const [uid, setUid] = useState<string | null>(null);
  const [tab, setTab] = useState<"received" | "sent">("received");
  useEffect(() => { supabase.auth.getUser().then(({ data }) => setUid(data.user?.id ?? null)); }, []);

  const { data, isLoading } = useQuery({
    queryKey: ["offers", uid, tab],
    queryFn: async (): Promise<OfferRow[]> => {
      if (!uid) return [];
      const col = tab === "received" ? "seller_id" : "buyer_id";
      const { data } = await supabase.from("offers").select("*, listings(title,price_usd)").eq(col, uid).order("created_at", { ascending: false });
      return (data ?? []) as OfferRow[];
    },
    enabled: !!uid,
  });

  async function respond(offer: OfferRow, status: "accepted" | "rejected" | "withdrawn") {
    await supabase.from("offers").update({ status }).eq("id", offer.id);
    if (status === "accepted") {
      // Create order + reserve listing
      await supabase.from("orders").insert({
        listing_id: offer.listing_id,
        buyer_id: offer.buyer_id,
        seller_id: offer.seller_id,
        price_usd: offer.amount_usd,
        status: "pending",
      });
      await supabase.from("listings").update({ status: "reserved" }).eq("id", offer.listing_id);
      await supabase.from("notifications").insert({
        user_id: offer.buyer_id,
        type: "offer",
        title: "Offer accepted",
        body: `Your offer of $${offer.amount_usd.toLocaleString()} was accepted. Continue to checkout.`,
        link: "/orders",
      });
    } else if (status === "rejected") {
      await supabase.from("notifications").insert({
        user_id: offer.buyer_id,
        type: "offer",
        title: "Offer declined",
        body: `Your offer of $${offer.amount_usd.toLocaleString()} was declined.`,
        link: null,
      });
    }
    qc.invalidateQueries({ queryKey: ["offers", uid, tab] });
    qc.invalidateQueries({ queryKey: ["dashboard-summary"] });
  }

  return (
    <AccountLayout title="Offers">
      <div className="flex gap-2 mb-4">
        {(["received", "sent"] as const).map((k) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`rounded-full px-4 py-1.5 text-xs font-medium border transition capitalize ${
              tab === k ? "btn-gold text-onyx border-transparent" : "border-white/10 text-silver/80 hover:border-gold/30"
            }`}
          >{k}</button>
        ))}
      </div>

      {isLoading ? (
        <div className="text-sm text-silver/60">Loading…</div>
      ) : !data || data.length === 0 ? (
        <div className="glass rounded-2xl p-10 text-center border border-white/10">
          <div className="text-4xl">⇄</div>
          <p className="text-sm text-silver/70 mt-2">No offers {tab === "received" ? "yet" : "sent yet"}.</p>
          <Link to="/marketplace" className="mt-3 inline-flex btn-gold rounded-full px-4 py-2 text-xs">Browse marketplace</Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {data.map((o) => (
            <li key={o.id} className="glass rounded-2xl border border-white/10 p-4">
              <div className="flex items-start gap-4 flex-wrap">
                <div className="flex-1 min-w-[200px]">
                  <Link to="/listing/$id" params={{ id: o.listing_id }} className="text-sm font-medium hover:text-gold">
                    {o.listings?.title || "Listing"}
                  </Link>
                  {o.listings?.price_usd && (
                    <p className="text-[10px] text-silver/50 mt-0.5">Listed at ${o.listings.price_usd.toLocaleString()}</p>
                  )}
                  {o.message && <p className="text-xs text-silver/70 mt-2 italic">"{o.message}"</p>}
                  <p className="text-[10px] text-silver/50 mt-1">{new Date(o.created_at).toLocaleString()}</p>
                </div>
                <div className="text-right">
                  <p className="font-display text-xl text-gradient-gold">{(o.amount_usd / usdPerPi).toLocaleString(undefined, { maximumFractionDigits: 5 })} π</p>
                  <p className="text-[10px] text-silver/50">${o.amount_usd.toLocaleString()}</p>
                </div>
                <OfferBadge status={o.status} />
              </div>
              {o.status === "pending" && (
                <div className="flex gap-2 mt-3 pt-3 border-t border-white/5">
                  {tab === "received" ? (
                    <>
                      <button onClick={() => respond(o, "accepted")} className="btn-gold rounded-full px-4 py-1.5 text-xs">Accept</button>
                      <button onClick={() => respond(o, "rejected")} className="btn-ghost-silver rounded-full px-4 py-1.5 text-xs">Decline</button>
                    </>
                  ) : (
                    <button onClick={() => respond(o, "withdrawn")} className="btn-ghost-silver rounded-full px-4 py-1.5 text-xs">Withdraw offer</button>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </AccountLayout>
  );
}

function OfferBadge({ status }: { status: OfferRow["status"] }) {
  const tone: Record<string, string> = {
    pending: "bg-amber-500/15 text-amber-300 border-amber-500/30",
    accepted: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
    rejected: "bg-red-500/10 text-red-300 border-red-500/20",
    withdrawn: "bg-white/5 text-silver/60 border-white/10",
    expired: "bg-white/5 text-silver/60 border-white/10",
  };
  return <span className={`rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-widest ${tone[status]}`}>{status}</span>;
}
