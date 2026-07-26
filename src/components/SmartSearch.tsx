import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { smartSearch, type SmartFilters } from "@/lib/ai-search.functions";

export function SmartSearch({ onResult }: { onResult: (f: SmartFilters) => void }) {
  const run = useServerFn(smartSearch);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!q.trim()) return;
    setBusy(true); setErr(null);
    try {
      const r = await run({ data: { query: q.trim() } });
      onResult(r);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Search failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="glass-strong rounded-3xl border border-gold/20 p-4 sm:p-5">
      <div className="mb-2 flex items-center gap-2">
        <span className="text-[10px] uppercase tracking-widest text-gold">✦ AI Smart Search</span>
        <span className="text-[10px] text-silver/50">Ask in your own words</span>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="e.g. affordable used electric car in Germany under 30k"
          className="w-full flex-1 rounded-full border border-white/10 bg-black/40 px-5 py-3 text-silver placeholder:text-muted-foreground/70 focus:border-gold/60 focus:outline-none focus:ring-2 focus:ring-gold/30"
        />
        <button
          type="submit"
          disabled={busy || !q.trim()}
          className="btn-gold rounded-full px-6 py-3 text-sm disabled:opacity-50"
        >
          {busy ? "Thinking…" : "Ask AI"}
        </button>
      </div>
      {err && <p className="mt-2 text-xs text-destructive">{err}</p>}
    </form>
  );
}
