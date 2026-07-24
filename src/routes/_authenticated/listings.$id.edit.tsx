import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AccountLayout } from "@/components/AccountLayout";
import { ListingForm } from "@/components/ListingForm";
import type { ListingRow, ListingMediaRow } from "@/lib/listings";

export const Route = createFileRoute("/_authenticated/listings/$id/edit")({
  head: () => ({
    meta: [
      { title: "Edit Listing · Pi Global Marketplace" },
      { name: "description", content: "Edit your Pi Global Marketplace listing details, photos, price and status." },
      { property: "og:title", content: "Edit Listing · Pi Global Marketplace" },
      { property: "og:description", content: "Update your listing on Pi Global Marketplace." },
    ],
  }),
  component: EditListingPage,
});

function EditListingPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();

  const { data, isLoading, error } = useQuery({
    queryKey: ["listing-edit", id],
    queryFn: async () => {
      const [{ data: listing }, { data: media }] = await Promise.all([
        supabase.from("listings").select("*").eq("id", id).maybeSingle(),
        supabase.from("listing_media").select("*").eq("listing_id", id).order("sort_order"),
      ]);
      return { listing: listing as ListingRow | null, media: (media ?? []) as ListingMediaRow[] };
    },
  });

  return (
    <AccountLayout title="Edit Listing">
      {isLoading ? (
        <div className="text-sm text-silver/60">Loading…</div>
      ) : error || !data?.listing ? (
        <div className="glass rounded-2xl p-10 text-center border border-white/10">
          <p className="text-sm text-silver/70">Listing not found or you don't have access.</p>
          <Link to="/listings" className="mt-3 inline-flex btn-gold rounded-full px-4 py-2 text-xs">Back to listings</Link>
        </div>
      ) : (
        <ListingForm
          initial={data.listing}
          initialMedia={data.media}
          onSaved={() => navigate({ to: "/listings" })}
        />
      )}
    </AccountLayout>
  );
}
