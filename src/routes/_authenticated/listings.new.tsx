import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AccountLayout } from "@/components/AccountLayout";
import { ListingForm } from "@/components/ListingForm";

export const Route = createFileRoute("/_authenticated/listings/new")({
  head: () => ({
    meta: [
      { title: "Add New Listing · Pi Global Marketplace" },
      { name: "description", content: "Create a premium listing on Pi Global Marketplace. Upload photos and video, set your Pi price, and reach verified buyers." },
      { property: "og:title", content: "Add New Listing · Pi Global Marketplace" },
      { property: "og:description", content: "List globally. Get paid in Pi." },
    ],
  }),
  component: NewListingPage,
});

function NewListingPage() {
  const navigate = useNavigate();
  return (
    <AccountLayout title="Add New Listing">
      <ListingForm
        onSaved={(id, status) => {
          if (status === "draft") navigate({ to: "/listings", search: { status: "draft" } as never });
          else navigate({ to: "/listing/$id", params: { id } });
        }}
      />
    </AccountLayout>
  );
}
