import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { MarketplaceCard } from "@/components/MarketplaceCard";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { supabase } from "@/integrations/supabase/client";
import type { ListingRow } from "@/lib/listings";
import type { MarketplaceItem, SellerLite } from "@/lib/marketplace";

export const Route = createFileRoute("/seller/$id")({
  head: () => ({
    meta: [
      { title: "Seller Profile · Pi Global Marketplace" },
      { name: "description", content: "Premium seller profile on Pi Global Marketplace — verified status, active listings, and reputation." },
      { property: "og:title", content: "Seller Profile · Pi Global Marketplace" },
      { property: "og:description", content: "Premium seller profile on Pi Global Marketplace." },
      { property: "og:type", content: "profile" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SellerProfile,
});

function SellerProfile() {
  const { id } = Route.useParams();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["seller", id],
    queryFn: async () => {
      const [{ data: profile }, { data: listings }] = await Promise.all([
        supabase.from("profiles").select("id, full_name, username, avatar_url, verified, country, city, biography, join_date")
          .eq("id", id).maybeSingle(),
        supabase.from("listings").select("*").eq("seller_id", id).eq("status", "active")
          .order("created_at", { ascending: false }).returns<ListingRow[]>(),
      ]);
      return { profile: profile as (SellerLite & { country: string | null; city: string | null; biography: string | null; join_date: string }) | null, listings: listings ?? [] };
    },
  });

  useEffect(() => {
    (async () => {
      const path = data?.profile?.avatar_url;
      if (!path) { setAvatarUrl(null); return; }
      if (path.startsWith("http")) { setAvatarUrl(path); return; }
      const { data: signed } = await supabase.storage.from("avatars").createSignedUrl(path, 3600);
      setAvatarUrl(signed?.signedUrl ?? null);
    })();
  }, [data?.profile?.avatar_url]);

  const p = data?.profile;
  const items: MarketplaceItem[] = (data?.listings ?? []).map((l) => ({
    listing: l,
    seller: p ? { id: p.id, full_name: p.full_name, username: p.username, avatar_url: p.avatar_url, verified: p.verified } : null,
  }));

  return (
    <div className="min-h-dvh flex flex-col">
      <Navbar />
      <main className="flex-1 mx-auto w-full max-w-7xl px-4 py-10 sm:px-6">
        {isLoading ? (
          <div className="text-sm text-silver/60">Loading…</div>
        ) : !p ? (
          <div className="glass rounded-2xl p-10 text-center border border-white/10">
            <p className="text-sm text-silver/70">Seller not found.</p>
            <Link to="/marketplace" className="mt-3 inline-flex btn-gold rounded-full px-4 py-2 text-xs">Back to marketplace</Link>
          </div>
        ) : (
          <>
            <section className="glass-strong rounded-3xl border border-white/10 p-6 sm:p-8">
              <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
                <div className="h-24 w-24 shrink-0 overflow-hidden rounded-full border border-gold/40 bg-black/40 grid place-items-center">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <span className="font-display text-3xl text-gradient-gold">
                      {(p.full_name?.[0] ?? p.username?.[0] ?? "?").toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="font-display text-3xl sm:text-4xl text-gradient-gold truncate">
                      {p.full_name ?? p.username ?? "Seller"}
                    </h1>
                    {p.verified && <VerifiedBadge />}
                  </div>
                  {p.username && <p className="text-sm text-silver/70">@{p.username}</p>}
                  <p className="mt-1 text-xs text-silver/60">
                    {[p.city, p.country].filter(Boolean).join(", ") || "—"} · Joined {new Date(p.join_date).toLocaleDateString(undefined, { month: "short", year: "numeric" })}
                  </p>
                  {p.biography && <p className="mt-3 text-sm text-silver/80 leading-relaxed whitespace-pre-wrap">{p.biography}</p>}
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-1 sm:w-40">
                  <Stat k="Active listings" v={items.length} />
                  <Stat k="Verified" v={p.verified ? "Yes" : "No"} />
                </div>
              </div>
            </section>

            <section className="mt-10">
              <h2 className="font-display text-2xl text-silver">Active listings</h2>
              {items.length === 0 ? (
                <div className="glass mt-4 rounded-2xl p-10 text-center text-muted-foreground border border-white/10">
                  This seller has no active listings yet.
                </div>
              ) : (
                <div className="mt-4 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {items.map((it) => <MarketplaceCard key={it.listing.id} item={it} />)}
                </div>
              )}
            </section>
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}

function Stat({ k, v }: { k: string; v: string | number }) {
  return (
    <div className="glass rounded-xl px-3 py-2 text-center border border-white/10">
      <div className="font-display text-xl text-gradient-gold">{v}</div>
      <div className="text-[10px] uppercase tracking-widest text-silver/60">{k}</div>
    </div>
  );
}
