import { createFileRoute, Link } from "@tanstack/react-router";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({
    meta: [
      { title: "Passwords are not used · Pi Global Marketplace" },
      { name: "description", content: "Pi Global Marketplace uses Pi Authentication only, so there is no password to reset." },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "Passwords are not used · Pi Global Marketplace" },
      { property: "og:description", content: "Sign in with Pi Authentication from the Pi Browser." },
    ],
  }),
  component: NoPasswords,
});

function NoPasswords() {
  return (
    <div className="min-h-dvh flex flex-col">
      <Navbar />
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="glass w-full max-w-md rounded-2xl border border-white/10 p-8 text-center">
          <h1 className="font-display text-3xl text-gradient-gold">No password to reset</h1>
          <p className="mt-3 text-sm text-silver/70">
            This marketplace signs you in with Pi Authentication from the Pi Browser, so there is no password and no
            email address on your account.
          </p>
          <Link to="/auth" className="btn-gold mt-6 inline-flex rounded-full px-5 py-2.5 text-sm">Continue with Pi</Link>
        </div>
      </main>
      <Footer />
    </div>
  );
}
