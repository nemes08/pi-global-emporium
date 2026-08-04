import { createFileRoute } from "@tanstack/react-router";
import { LegalPage, LegalSection } from "@/components/LegalPage";

export const Route = createFileRoute("/terms")({
  head: () => ({ meta: [
    { title: "Terms of Service · Pi Global Marketplace" },
    { name: "description", content: "Terms governing access to and use of Pi Global Marketplace." },
    { property: "og:title", content: "Terms of Service · Pi Global Marketplace" },
    { property: "og:description", content: "Terms governing access to and use of Pi Global Marketplace." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: TermsPage,
});

function TermsPage() {
  return <LegalPage title="Terms of Service" updated="August 4, 2026">
    <p className="mb-8">This page is maintained by the Pi Global Marketplace operator to explain the rules for using Pi Global Marketplace. By creating an account or using the marketplace, you agree to these terms.</p>
    <LegalSection title="Marketplace role"><p>Pi Global Marketplace provides tools for buyers and independent sellers to discover listings, communicate, place orders, and track transactions. Sellers are responsible for the accuracy, legality, condition, pricing, and delivery of their listings. Buyers must review listing details before transacting.</p></LegalSection>
    <LegalSection title="Accounts and eligibility"><p>You must provide accurate account information, protect your credentials, and promptly report unauthorized access. You may not impersonate another person, evade account restrictions, or use the service for unlawful activity.</p></LegalSection>
    <LegalSection title="Listings and conduct"><p>Do not publish illegal, counterfeit, deceptive, infringing, unsafe, or prohibited goods or content. We may moderate, reject, archive, or remove listings and restrict accounts when reasonably necessary to protect users or operate the service.</p></LegalSection>
    <LegalSection title="Pi payments and escrow"><p>Pi transactions require Pi Browser and the Pi Network payment flow. Displayed exchange and Community GCV values are references, not guarantees. The Community Ecosystem Reference is not an official Pi Network exchange rate. Escrow status in the app records the transaction workflow; blockchain transactions may be irreversible.</p></LegalSection>
    <LegalSection title="Disputes, refunds, and fees"><p>Users should use the in-app dispute workflow and provide truthful supporting details. Any refund or release is subject to transaction status, technical availability, and review. Fees, when shown before confirmation, form part of the transaction.</p></LegalSection>
    <LegalSection title="Availability and liability"><p>The service is provided on an “as available” basis. To the extent permitted by law, the operator is not responsible for independent sellers, off-platform conduct, market-value changes, or losses caused by information a user chooses to share.</p></LegalSection>
    <LegalSection title="Changes and contact"><p>These terms may be updated as the marketplace evolves. Material changes will be reflected by the date above. Account, transaction, and policy questions can be raised through the relevant in-app messaging or dispute workflow.</p></LegalSection>
  </LegalPage>;
}