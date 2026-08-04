import { createFileRoute } from "@tanstack/react-router";
import { LegalPage, LegalSection } from "@/components/LegalPage";

export const Route = createFileRoute("/cookies")({
  head: () => ({ meta: [
    { title: "Cookie Policy · Pi Global Marketplace" },
    { name: "description", content: "How Pi Global Marketplace uses cookies and local browser storage." },
    { property: "og:title", content: "Cookie Policy · Pi Global Marketplace" },
    { property: "og:description", content: "How Pi Global Marketplace uses cookies and local browser storage." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: CookiesPage,
});

function CookiesPage() {
  return <LegalPage title="Cookie Policy" updated="August 4, 2026">
    <p className="mb-8">This page is maintained by the Pi Global Marketplace operator and explains the browser storage used by the app.</p>
    <LegalSection title="Essential storage"><p>Authentication and security mechanisms may use cookies or equivalent browser storage to keep you signed in, protect requests, and maintain account state. Disabling essential storage can prevent sign-in and protected marketplace features from working.</p></LegalSection>
    <LegalSection title="Preference storage"><p>The app stores selected language, pricing mode, and configurable display-rate preferences in local browser storage so those choices persist between visits.</p></LegalSection>
    <LegalSection title="Third-party services"><p>Pi Browser and Pi Network services may process their own technical data when you authenticate or pay. Their handling is governed by their own policies. Lovable provides the app’s hosting and backend infrastructure.</p></LegalSection>
    <LegalSection title="Managing storage"><p>You can clear cookies and local storage using your browser or device settings. Doing so may sign you out and reset language or pricing preferences. The current app does not use browser storage for advertising profiles.</p></LegalSection>
  </LegalPage>;
}