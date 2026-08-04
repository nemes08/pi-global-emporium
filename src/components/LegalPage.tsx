import type { ReactNode } from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

export function LegalPage({ title, updated, children }: { title: string; updated: string; children: ReactNode }) {
  return (
    <div className="min-h-dvh flex flex-col">
      <Navbar />
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-12 sm:px-6">
        <header className="border-b border-white/10 pb-8">
          <p className="text-xs uppercase tracking-widest text-gold">Legal</p>
          <h1 className="mt-2 font-display text-4xl text-gradient-gold sm:text-5xl">{title}</h1>
          <p className="mt-3 text-sm text-muted-foreground">Last updated: {updated}</p>
        </header>
        <div className="legal-copy py-8 text-sm leading-7 text-silver/80">{children}</div>
      </main>
      <Footer />
    </div>
  );
}

export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="mb-3 font-display text-2xl text-silver">{title}</h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}