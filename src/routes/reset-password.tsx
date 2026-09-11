import { createFileRoute, Link } from "@tanstack/react-router";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Passwords are not used · Pi Global Marketplace" },
      { name: "description", content: "Pi Global Marketplace uses Pi Authentication only, so there is no password to change." },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "Passwords are not used · Pi Global Marketplace" },
      { property: "og:description", content: "Sign in with Pi Authentication from the Pi Browser." },
    ],
  }),
  component: NoPasswordReset,
});

function NoPasswordReset() {
  return (
    <div className="min-h-dvh flex flex-col">
      <Navbar />
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="glass w-full max-w-md rounded-2xl border border-white/10 p-8 text-center">
          <h1 className="font-display text-3xl text-gradient-gold">Nothing to change here</h1>
          <p className="mt-3 text-sm text-silver/70">
            Accounts here have no password. You sign in with Pi Authentication every time, straight from the Pi Browser.
          </p>
          <Link to="/auth" className="btn-gold mt-6 inline-flex rounded-full px-5 py-2.5 text-sm">Continue with Pi</Link>
        </div>
      </main>
      <Footer />
    </div>
  );
}
