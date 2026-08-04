import { createFileRoute } from "@tanstack/react-router";
import { LegalPage, LegalSection } from "@/components/LegalPage";

export const Route = createFileRoute("/privacy")({
  head: () => ({ meta: [
    { title: "Privacy Policy · Pi Global Marketplace" },
    { name: "description", content: "How Pi Global Marketplace collects, uses, and protects personal information." },
    { property: "og:title", content: "Privacy Policy · Pi Global Marketplace" },
    { property: "og:description", content: "How Pi Global Marketplace handles personal information." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return <LegalPage title="Privacy Policy" updated="August 4, 2026">
    <p className="mb-8">This page is maintained by the Pi Global Marketplace operator to answer common privacy questions about Pi Global Marketplace. It describes app-visible practices and is not an independent certification.</p>
    <LegalSection title="Information we process"><p>We process account details, profile information, listing content and media, messages, favorites, offers, orders, reviews, notifications, verification submissions, and dispute records that you provide or create. When you connect Pi, we process the Pi user identifier and username returned after server-side verification.</p></LegalSection>
    <LegalSection title="How information is used"><p>Information is used to operate accounts, publish listings, facilitate marketplace interactions, prevent abuse, verify sellers, provide support, resolve disputes, secure transactions, and improve service reliability.</p></LegalSection>
    <LegalSection title="Visibility and sharing"><p>Public profiles and active listings may be visible to anyone. Private contact details, account records, conversations, orders, escrow records, and verification material are restricted to authorized users and operational roles. Information may also be processed by infrastructure and Pi Network services needed to provide authentication, storage, and payments.</p></LegalSection>
    <LegalSection title="Storage and security"><p>The app uses Lovable Cloud for database, authentication, and private file storage. Access controls are applied according to user and operational roles. No online system can guarantee absolute security, so users should protect credentials and avoid sharing sensitive information in listing descriptions or messages.</p></LegalSection>
    <LegalSection title="Retention and deletion"><p>Records are retained while needed to provide the service, maintain transaction and dispute history, prevent fraud, or satisfy applicable obligations. Account and privacy requests may be submitted through account settings or the relevant in-app support workflow; some transaction records may need to be retained.</p></LegalSection>
    <LegalSection title="Your choices"><p>You can edit profile and listing information, control optional pricing preferences, disconnect your Pi identity, and manage account security in the app. Browser storage and cookies can also be controlled through your browser, subject to essential session functionality.</p></LegalSection>
    <LegalSection title="Shared responsibility"><p>Lovable provides hosting and platform capabilities; the Pi Global Marketplace operator is responsible for app configuration, marketplace policies, and responses to user requests. Pi Network separately governs its browser, identity, and payment services.</p></LegalSection>
  </LegalPage>;
}