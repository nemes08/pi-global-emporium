import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { PriceDisplay, usePricing } from "@/lib/pricing";
import { useAuth } from "@/lib/auth";
import { CATEGORY_LABELS, type CategoryKey } from "@/lib/catalog";
import { signMediaUrl, STATUS_LABEL, STATUS_TONE, type ListingRow, type ListingMediaRow } from "@/lib/listings";

export const Route = createFileRoute("/listing/$id")({
  head: () => ({
    meta: [
      { title: "Listing · Pi Global Marketplace" },
      { name: "description", content: "Premium listing on Pi Global Marketplace. Buy, reserve or make an offer in Pi." },
      { property: "og:title", content: "Listing · Pi Global Marketplace" },
      { property: "og:description", content: "Buy, reserve or make an offer in Pi." },
    ],
  }),
  component: ListingDetail,
});

function ListingDetail() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { usdPerPi } = usePricing();

  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

  const { data, isLoading } = useQuery({
    queryKey: ["listing", id],
    queryFn: async () => {
      if (!isUuid) return { listing: null, media: [] as ListingMediaRow[] };
      const [{ data: listing }, { data: media }] = await Promise.all([
        supabase.from("listings").select("*").eq("id", id).maybeSingle(),
        supabase.from("listing_media").select("*").eq("listing_id", id).order("sort_order"),
      ]);
      return { listing: listing as ListingRow | null, media: (media ?? []) as ListingMediaRow[] };
    },
  });


  const [mediaUrls, setMediaUrls] = useState<{ url: string; type: string }[]>([]);
  const [activeIdx, setActiveIdx] = useState(0);
  const [isFav, setIsFav] = useState(false);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [showOffer, setShowOffer] = useState(false);
  const [offerAmount, setOfferAmount] = useState("");
  const [offerMsg, setOfferMsg] = useState("");

  useEffect(() => {
    (async () => {
      if (!data?.media?.length && data?.listing?.cover_image) {
        const url = await signMediaUrl(data.listing.cover_image);
        setMediaUrls(url ? [{ url, type: "image" }] : []);
        return;
      }
      if (!data?.media) return;
      const urls = await Promise.all(data.media.map(async (m) => ({ url: (await signMediaUrl(m.storage_path)) ?? "", type: m.media_type })));
      setMediaUrls(urls.filter((u) => u.url));
    })();
  }, [data]);

  // Track view + recently viewed
  useEffect(() => {
    if (!data?.listing) return;
    supabase.from("listings").update({ views_count: (data.listing.views_count ?? 0) + 1 }).eq("id", id).then(() => {});
    if (user) {
      supabase.from("recently_viewed").upsert({ user_id: user.id, listing_id: id, viewed_at: new Date().toISOString() }).then(() => {});
    }
  }, [data?.listing?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!user) return;
    supabase.from("favorites").select("listing_id").eq("user_id", user.id).eq("listing_id", id).maybeSingle().then(({ data }) => setIsFav(!!data));
  }, [user, id]);

  function showToast(t: string) { setToast(t); setTimeout(() => setToast(null), 2500); }

  async function toggleFavorite() {
    if (!user) { navigate({ to: "/auth" }); return; }
    if (isFav) {
      await supabase.from("favorites").delete().eq("user_id", user.id).eq("listing_id", id);
      setIsFav(false);
      showToast("Removed from favorites");
    } else {
      await supabase.from("favorites").insert({ user_id: user.id, listing_id: id });
      setIsFav(true);
      showToast("Saved to favorites");
    }
  }

  async function share() {
    const url = typeof window !== "undefined" ? window.location.href : "";
    try {
      if (navigator.share) await navigator.share({ title: data?.listing?.title ?? "Listing", url });
      else { await navigator.clipboard.writeText(url); showToast("Link copied"); }
    } catch {}
  }

  async function openMessage() {
    if (!user) { navigate({ to: "/auth" }); return; }
    if (!data?.listing) return;
    if (user.id === data.listing.seller_id) { showToast("This is your own listing"); return; }
    setBusy(true);
    const { data: existing } = await supabase
      .from("conversations")
      .select("id")
      .eq("listing_id", id).eq("buyer_id", user.id).eq("seller_id", data.listing.seller_id)
      .maybeSingle();
    let convId = existing?.id;
    if (!convId) {
      const { data: inserted } = await supabase.from("conversations").insert({
        listing_id: id, buyer_id: user.id, seller_id: data.listing.seller_id,
      }).select("id").single();
      convId = inserted?.id;
    }
    setBusy(false);
    if (convId) navigate({ to: "/messages" });
  }

  async function buyNow() {
    if (!user) { navigate({ to: "/auth" }); return; }
    if (!data?.listing) return;
    if (user.id === data.listing.seller_id) { showToast("You can't buy your own listing"); return; }
    setBusy(true);
    try {
      await supabase.from("orders").insert({
        listing_id: id, buyer_id: user.id, seller_id: data.listing.seller_id,
        price_usd: data.listing.price_usd, status: "pending",
      });
      await supabase.from("listings").update({ status: "reserved" }).eq("id", id);
      await supabase.from("notifications").insert({
        user_id: data.listing.seller_id, type: "order",
        title: "New order", body: `Your listing "${data.listing.title}" was reserved.`, link: "/orders",
      });
      showToast("Order created — check Orders to pay with Pi");
      qc.invalidateQueries({ queryKey: ["listing", id] });
      navigate({ to: "/orders" });
    } finally { setBusy(false); }
  }

  async function reserve() {
    if (!user) { navigate({ to: "/auth" }); return; }
    if (!data?.listing) return;
    if (user.id === data.listing.seller_id) return;
    setBusy(true);
    try {
      await supabase.from("orders").insert({
        listing_id: id, buyer_id: user.id, seller_id: data.listing.seller_id,
        price_usd: data.listing.price_usd, status: "pending",
        notes: "Reserved with Pi (pending payment)",
      });
      await supabase.from("listings").update({ status: "reserved" }).eq("id", id);
      showToast("Reserved. Continue in Orders to complete Pi payment.");
      qc.invalidateQueries({ queryKey: ["listing", id] });
      navigate({ to: "/orders" });
    } finally { setBusy(false); }
  }

  async function submitOffer(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !data?.listing) return;
    const amount = parseFloat(offerAmount);
    if (!amount || amount <= 0) { showToast("Enter a valid amount"); return; }
    setBusy(true);
    try {
      await supabase.from("offers").insert({
        listing_id: id, buyer_id: user.id, seller_id: data.listing.seller_id,
        amount_usd: amount, message: offerMsg.trim() || null, status: "pending",
      });
      await supabase.from("notifications").insert({
        user_id: data.listing.seller_id, type: "offer",
        title: "New offer received", body: `Offer of $${amount.toLocaleString()} on "${data.listing.title}"`, link: "/offers",
      });
      setShowOffer(false); setOfferAmount(""); setOfferMsg("");
      showToast("Offer sent");
    } finally { setBusy(false); }
  }

  const l = data?.listing;
  const isOwner = user && l && user.id === l.seller_id;
  const canTransact = l && (l.status === "active");

  return (
    <div className="min-h-dvh flex flex-col">
      <Navbar />
      <main className="flex-1 mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
        {isLoading ? (
          <div className="text-sm text-silver/60">Loading…</div>
        ) : !l ? (
          <div className="glass rounded-2xl p-10 text-center border border-white/10">
            <p className="text-sm text-silver/70">Listing not found or unavailable.</p>
            <Link to="/marketplace" className="mt-3 inline-flex btn-gold rounded-full px-4 py-2 text-xs">Back to marketplace</Link>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
            <div>
              <div className="glass rounded-3xl overflow-hidden border border-white/10">
                <div className="relative aspect-[16/10] bg-black/50">
                  {mediaUrls[activeIdx]?.type === "video" ? (
                    <video src={mediaUrls[activeIdx].url} controls className="h-full w-full object-contain" />
                  ) : mediaUrls[activeIdx]?.url ? (
                    <img src={mediaUrls[activeIdx].url} alt={l.title} className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full w-full grid place-items-center text-5xl text-silver/40">🖼️</div>
                  )}
                  <span className={`absolute top-3 left-3 rounded-full border px-3 py-1 text-[10px] uppercase tracking-widest ${STATUS_TONE[l.status]}`}>
                    {STATUS_LABEL[l.status]}
                  </span>
                </div>
                {mediaUrls.length > 1 && (
                  <div className="flex gap-2 p-3 overflow-x-auto">
                    {mediaUrls.map((m, i) => (
                      <button key={i} onClick={() => setActiveIdx(i)} className={`h-16 w-24 shrink-0 rounded-lg overflow-hidden border ${i === activeIdx ? "border-gold" : "border-white/10"}`}>
                        {m.type === "video" ? (
                          <div className="h-full w-full grid place-items-center bg-black text-xs text-silver">▶</div>
                        ) : (
                          <img src={m.url} alt="" className="h-full w-full object-cover" />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-6 glass rounded-3xl border border-white/10 p-6">
                <p className="text-[10px] uppercase tracking-widest text-gold">{CATEGORY_LABELS[l.category as CategoryKey] ?? l.category}</p>
                <h1 className="font-display text-3xl sm:text-4xl mt-1 text-gradient-gold">{l.title}</h1>
                <p className="text-sm text-silver/60 mt-1">
                  {l.city || "—"}{l.country ? `, ${l.country}` : ""}{l.year ? ` · ${l.year}` : ""}
                </p>
                {l.description && <p className="mt-4 text-sm text-silver/80 whitespace-pre-wrap leading-relaxed">{l.description}</p>}

                <dl className="mt-5 grid gap-2 sm:grid-cols-2 text-sm">
                  {l.brand && <Field k="Brand" v={l.brand} />}
                  {l.model && <Field k="Model" v={l.model} />}
                  {l.condition && <Field k="Condition" v={l.condition} />}
                  {l.mileage && <Field k="Mileage" v={`${l.mileage.toLocaleString()} km`} />}
                  {l.fuel && <Field k="Fuel" v={l.fuel} />}
                  {l.transmission && <Field k="Transmission" v={l.transmission} />}
                  <Field k="Negotiable" v={l.negotiable ? "Yes" : "No"} />
                </dl>
              </div>
            </div>

            <aside className="lg:sticky lg:top-24 h-fit space-y-4">
              <div className="glass-strong rounded-3xl border border-gold/20 p-6">
                <PriceDisplay usd={l.price_usd} />
                <div className="mt-5 grid gap-2">
                  {isOwner ? (
                    <Link to="/listings/$id/edit" params={{ id: l.id }} className="btn-gold rounded-full px-4 py-2.5 text-sm text-center">Edit listing</Link>
                  ) : (
                    <>
                      <button disabled={!canTransact || busy} onClick={buyNow} className="btn-gold rounded-full px-4 py-2.5 text-sm disabled:opacity-50">Buy Now with Pi</button>
                      <button disabled={!canTransact || busy} onClick={reserve} className="btn-ghost-silver rounded-full px-4 py-2.5 text-sm disabled:opacity-50">Reserve with Pi</button>
                      {l.negotiable && (
                        <button disabled={!canTransact || busy} onClick={() => setShowOffer((v) => !v)} className="btn-ghost-silver rounded-full px-4 py-2.5 text-sm disabled:opacity-50">Make an Offer</button>
                      )}
                      <button disabled={busy} onClick={openMessage} className="btn-ghost-silver rounded-full px-4 py-2.5 text-sm">Message seller</button>
                    </>
                  )}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button onClick={toggleFavorite} className="btn-ghost-silver rounded-full px-3 py-2 text-xs">
                      {isFav ? "♥ Saved" : "♡ Save"}
                    </button>
                    <button onClick={share} className="btn-ghost-silver rounded-full px-3 py-2 text-xs">⇪ Share</button>
                  </div>
                </div>

                {showOffer && (
                  <form onSubmit={submitOffer} className="mt-5 space-y-2 border-t border-white/10 pt-4">
                    <label className="block">
                      <span className="text-[10px] uppercase tracking-widest text-silver/70">Your offer (USD)</span>
                      <input type="number" step="0.01" min="0" value={offerAmount} onChange={(e) => setOfferAmount(e.target.value)} className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-silver focus:outline-none focus:ring-2 focus:ring-gold/40" />
                    </label>
                    <label className="block">
                      <span className="text-[10px] uppercase tracking-widest text-silver/70">Message (optional)</span>
                      <textarea rows={3} maxLength={500} value={offerMsg} onChange={(e) => setOfferMsg(e.target.value)} className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-silver focus:outline-none focus:ring-2 focus:ring-gold/40" />
                    </label>
                    {offerAmount && <p className="text-[10px] text-silver/60">≈ {(parseFloat(offerAmount) / usdPerPi || 0).toLocaleString(undefined, { maximumFractionDigits: 5 })} π</p>}
                    <button disabled={busy} className="btn-gold w-full rounded-full px-4 py-2 text-sm">Send offer</button>
                  </form>
                )}

                <p className="mt-5 text-[10px] text-silver/50 leading-snug">
                  Community GCV Reference (1 π = 314,159 USD) is a community ecosystem reference and is NOT an official Pi Network exchange rate.
                </p>
              </div>

              {isOwner ? <OwnerContactCard listingId={l.id} /> : null}
            </aside>
          </div>
        )}
      </main>
      <Footer />
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 glass-strong rounded-full border border-gold/40 px-5 py-2 text-sm shadow-[var(--shadow-luxe)] z-50">
          {toast}
        </div>
      )}
    </div>
  );
}

function Field({ k, v }: { k: string; v: string | number }) {
  return (
    <div className="flex items-center justify-between border-b border-white/5 py-1.5">
      <dt className="text-silver/60">{k}</dt>
      <dd className="text-silver">{v}</dd>
    </div>
  );
}

function OwnerContactCard({ listingId }: { listingId: string }) {
  const { data } = useQuery({
    queryKey: ["listing-contact", listingId],
    queryFn: async () => {
      const { data } = await supabase
        .from("listing_contacts")
        .select("seller_phone, seller_email")
        .eq("listing_id", listingId)
        .maybeSingle();
      return data;
    },
  });
  if (!data?.seller_email && !data?.seller_phone) return null;
  return (
    <div className="glass rounded-2xl p-5 border border-white/10">
      <p className="text-xs uppercase tracking-widest text-silver/60">Your contact info (private)</p>
      {data.seller_email && <p className="mt-2 text-sm break-words">✉ {data.seller_email}</p>}
      {data.seller_phone && <p className="text-sm">☎ {data.seller_phone}</p>}
    </div>
  );
}
