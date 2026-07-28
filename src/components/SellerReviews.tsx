import { useEffect, useMemo, useState } from "react";
import { fetchSellerReviews, submitReview, type ReviewRow } from "@/lib/reviews";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";

function Stars({ value, max = 5, onChange, size = "text-base" }: { value: number; max?: number; onChange?: (v: number) => void; size?: string }) {
  return (
    <span className={`inline-flex items-center gap-0.5 ${size}`}>
      {Array.from({ length: max }).map((_, i) => {
        const filled = i < value;
        const btn = (
          <span key={i} className={filled ? "text-gold" : "text-white/25"}>
            {filled ? "★" : "☆"}
          </span>
        );
        if (!onChange) return btn;
        return (
          <button key={i} type="button" onClick={() => onChange(i + 1)} aria-label={`${i + 1} star`}>
            {btn}
          </button>
        );
      })}
    </span>
  );
}

export function SellerReviews({ sellerId }: { sellerId: string }) {
  const { user } = useAuth();
  const [reviews, setReviews] = useState<ReviewRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  async function refresh() {
    setLoading(true);
    setReviews(await fetchSellerReviews(sellerId));
    setLoading(false);
  }

  useEffect(() => { refresh(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [sellerId]);

  const alreadyReviewed = useMemo(
    () => (user ? reviews.some((r) => r.buyer_id === user.id) : false),
    [user, reviews],
  );
  const isSelf = user?.id === sellerId;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) { window.location.href = "/auth"; return; }
    setBusy(true); setErr(null); setOk(false);
    try {
      // Look up the most recent completed order between buyer and seller so
      // the review can be anchored to a real transaction (matches RLS check).
      const { data: order } = await supabase
        .from("orders")
        .select("id")
        .eq("buyer_id", user.id)
        .eq("seller_id", sellerId)
        .in("status", ["paid", "shipped", "completed"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      await submitReview({
        sellerId,
        buyerId: user.id,
        orderId: order?.id ?? null,
        rating,
        comment: comment.trim() || undefined,
      });
      setOk(true); setComment(""); setRating(5);
      await refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not submit review.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="glass rounded-3xl border border-white/10 p-6">
      <h3 className="font-display text-xl text-silver">Reviews</h3>

      {loading ? (
        <p className="mt-3 text-xs text-silver/60">Loading reviews…</p>
      ) : reviews.length === 0 ? (
        <p className="mt-3 text-xs text-silver/60">No reviews yet.</p>
      ) : (
        <ul className="mt-4 space-y-4">
          {reviews.map((r) => (
            <li key={r.id} className="glass rounded-2xl border border-white/10 p-4">
              <div className="flex items-center justify-between gap-3">
                <Stars value={r.rating} />
                <span className="text-[10px] uppercase tracking-widest text-silver/50">
                  {new Date(r.created_at).toLocaleDateString(undefined, { month: "short", year: "numeric" })}
                </span>
              </div>
              {r.comment && <p className="mt-2 text-sm text-silver/85 whitespace-pre-wrap">{r.comment}</p>}
            </li>
          ))}
        </ul>
      )}

      {!isSelf && user && !alreadyReviewed && (
        <form onSubmit={onSubmit} className="mt-6 border-t border-white/10 pt-5">
          <p className="text-[10px] uppercase tracking-widest text-silver/60">Write a review</p>
          <div className="mt-2 flex items-center gap-3">
            <span className="text-xs text-silver/70">Rating</span>
            <Stars value={rating} onChange={setRating} size="text-2xl" />
          </div>
          <textarea
            rows={3}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            maxLength={800}
            placeholder="Share your experience with this seller…"
            className="mt-3 w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-silver placeholder:text-muted-foreground/70 focus:border-gold/60 focus:outline-none focus:ring-2 focus:ring-gold/30"
          />
          <div className="mt-3 flex items-center gap-2">
            <button
              type="submit"
              disabled={busy}
              className="btn-gold rounded-full px-5 py-2 text-xs disabled:opacity-50"
            >
              {busy ? "Publishing…" : "Publish review"}
            </button>
            {ok && <span className="text-xs text-emerald-300">Review published ✓</span>}
            {err && <span className="text-xs text-destructive">{err}</span>}
          </div>
          <p className="mt-2 text-[10px] text-silver/50">
            Reviews from buyers with a completed transaction are highlighted.
          </p>
        </form>
      )}

      {!isSelf && user && alreadyReviewed && (
        <p className="mt-4 text-[11px] text-silver/60">You've already reviewed this seller.</p>
      )}

      {!user && (
        <p className="mt-4 text-[11px] text-silver/60">
          <a href="/auth" className="text-gold underline-offset-4 hover:underline">Sign in</a> to leave a review.
        </p>
      )}
    </div>
  );
}
