import { useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { CATEGORIES, CATEGORY_LABELS, COUNTRIES, FUELS, TRANSMISSIONS, CONDITIONS, type CategoryKey } from "@/lib/catalog";
import { GCV_USD_PER_PI, usePricing } from "@/lib/pricing";
import type { ListingRow, ListingMediaRow, ListingStatus } from "@/lib/listings";
import { signMediaUrl } from "@/lib/listings";

const schema = z.object({
  title: z.string().trim().min(3).max(140),
  description: z.string().trim().max(4000).optional().nullable(),
  category: z.string().min(1),
  brand: z.string().trim().max(80).optional().nullable(),
  model: z.string().trim().max(120).optional().nullable(),
  year: z.number().int().min(1900).max(2100).optional().nullable(),
  country: z.string().trim().max(80).optional().nullable(),
  city: z.string().trim().max(120).optional().nullable(),
  price_usd: z.number().nonnegative(),
  negotiable: z.boolean(),
  condition: z.string().optional().nullable(),
  mileage: z.number().int().nonnegative().optional().nullable(),
  fuel: z.string().optional().nullable(),
  transmission: z.string().optional().nullable(),
  seller_phone: z.string().trim().max(40).optional().nullable(),
  seller_email: z.string().trim().email().max(200).optional().nullable().or(z.literal("")),
});

type Media = { id: string; storage_path: string; media_type: string; url?: string | null; isNew?: boolean; file?: File };

type Props = {
  initial?: ListingRow | null;
  initialMedia?: ListingMediaRow[];
  onSaved?: (id: string, status: ListingStatus) => void;
};

export function ListingForm({ initial, initialMedia, onSaved }: Props) {
  const { mode } = usePricing();
  const [form, setForm] = useState({
    title: initial?.title ?? "",
    description: initial?.description ?? "",
    category: initial?.category ?? "",
    brand: initial?.brand ?? "",
    model: initial?.model ?? "",
    year: initial?.year ? String(initial.year) : "",
    country: initial?.country ?? "",
    city: initial?.city ?? "",
    price_usd: initial?.price_usd ? String(initial.price_usd) : "",
    negotiable: initial?.negotiable ?? false,
    condition: initial?.condition ?? "",
    mileage: initial?.mileage ? String(initial.mileage) : "",
    fuel: initial?.fuel ?? "",
    transmission: initial?.transmission ?? "",
    seller_phone: "",
    seller_email: "",
  });
  const [media, setMedia] = useState<Media[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  // Load private contact info for edit mode
  useEffect(() => {
    if (!initial?.id) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("listing_contacts")
        .select("seller_phone, seller_email")
        .eq("listing_id", initial.id)
        .maybeSingle();
      if (!cancelled && data) {
        setForm((f) => ({ ...f, seller_phone: data.seller_phone ?? "", seller_email: data.seller_email ?? "" }));
      }
    })();
    return () => { cancelled = true; };
  }, [initial?.id]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!initialMedia?.length) return;
      const withUrls = await Promise.all(
        initialMedia.map(async (m) => ({
          id: m.id,
          storage_path: m.storage_path,
          media_type: m.media_type,
          url: await signMediaUrl(m.storage_path),
        })),
      );
      if (!cancelled) setMedia(withUrls);
    })();
    return () => { cancelled = true; };
  }, [initialMedia]);

  const priceUsd = parseFloat(form.price_usd || "0") || 0;
  const piEquivalent = priceUsd / GCV_USD_PER_PI;

  function pickFiles(files: FileList | null) {
    if (!files) return;
    const next: Media[] = [];
    for (const f of Array.from(files)) {
      const isVideo = f.type.startsWith("video/");
      next.push({
        id: `new-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        storage_path: "",
        media_type: isVideo ? "video" : "image",
        url: URL.createObjectURL(f),
        isNew: true,
        file: f,
      });
    }
    setMedia((prev) => [...prev, ...next]);
  }

  function removeMedia(id: string) {
    setMedia((prev) => prev.filter((m) => m.id !== id));
  }

  async function submit(status: ListingStatus) {
    setErr(null); setMsg(null); setBusy(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Not signed in");

      // Basic guard: publishing requires title + category + price
      if (status !== "draft") {
        if (!form.title.trim()) throw new Error("Title is required to publish");
        if (!form.category) throw new Error("Category is required to publish");
        if (!priceUsd || priceUsd <= 0) throw new Error("Price must be greater than 0 to publish");
      }

      const parsed = schema.parse({
        title: form.title || "Untitled listing",
        description: form.description || null,
        category: form.category || "services",
        brand: form.brand || null,
        model: form.model || null,
        year: form.year ? parseInt(form.year, 10) : null,
        country: form.country || null,
        city: form.city || null,
        price_usd: priceUsd,
        negotiable: form.negotiable,
        condition: form.condition || null,
        mileage: form.mileage ? parseInt(form.mileage, 10) : null,
        fuel: form.fuel || null,
        transmission: form.transmission || null,
        seller_phone: form.seller_phone || null,
        seller_email: form.seller_email || null,
      });

      const { seller_phone, seller_email, ...listingFields } = parsed;
      const payload = {
        seller_id: u.user.id,
        ...listingFields,
        pricing_mode: mode,
        status,
      };

      let listingId = initial?.id;
      if (initial) {
        const { error } = await supabase.from("listings").update(payload).eq("id", initial.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from("listings").insert(payload).select("id").single();
        if (error) throw error;
        listingId = data.id;
      }
      if (!listingId) throw new Error("Failed to save listing");

      // Upsert private seller contact info
      await supabase.from("listing_contacts").upsert({
        listing_id: listingId,
        seller_id: u.user.id,
        seller_phone: seller_phone || null,
        seller_email: (seller_email as string | null) || null,
      });

      // Upload new media
      const newFiles = media.filter((m) => m.isNew && m.file);
      const uploaded: { path: string; type: string; sort: number }[] = [];
      let sort = 0;
      for (const m of media) {
        if (m.isNew && m.file) {
          const ext = m.file.name.split(".").pop() || (m.media_type === "video" ? "mp4" : "jpg");
          const path = `${u.user.id}/${listingId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
          const { error: upErr } = await supabase.storage.from("listings").upload(path, m.file, { upsert: false, contentType: m.file.type });
          if (upErr) throw upErr;
          uploaded.push({ path, type: m.media_type, sort });
        }
        sort += 1;
      }
      if (uploaded.length) {
        const rows = uploaded.map((u2) => ({
          listing_id: listingId!,
          seller_id: u.user!.id,
          storage_path: u2.path,
          media_type: u2.type,
          sort_order: u2.sort,
        }));
        const { error: mErr } = await supabase.from("listing_media").insert(rows);
        if (mErr) throw mErr;
      }

      // Delete removed media (only for edit)
      if (initial && initialMedia) {
        const keptIds = new Set(media.filter((m) => !m.isNew).map((m) => m.id));
        const removed = initialMedia.filter((m) => !keptIds.has(m.id));
        if (removed.length) {
          await supabase.storage.from("listings").remove(removed.map((r) => r.storage_path));
          await supabase.from("listing_media").delete().in("id", removed.map((r) => r.id));
        }
      }

      // Set cover image from first image
      const firstImage = media.find((m) => m.media_type === "image");
      let coverPath: string | null = initial?.cover_image ?? null;
      if (firstImage) {
        if (firstImage.isNew) {
          const idx = newFiles.indexOf(firstImage);
          if (idx >= 0 && uploaded[idx]) coverPath = uploaded[idx].path;
        } else {
          coverPath = firstImage.storage_path;
        }
      }
      if (coverPath !== (initial?.cover_image ?? null)) {
        await supabase.from("listings").update({ cover_image: coverPath }).eq("id", listingId);
      }

      setMsg(status === "draft" ? "Saved as draft" : "Listing published");
      onSaved?.(listingId, status);
    } catch (e: unknown) {
      const raw = e instanceof Error ? e.message : "Failed to save listing";
      setErr(raw);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="glass-strong rounded-3xl border border-white/10 p-6 space-y-6">
      {/* Media */}
      <section>
        <h2 className="font-display text-xl text-gradient-gold">Photos & video</h2>
        <p className="text-xs text-silver/60 mt-1">Up to 20 photos (JPG/PNG) and 1 video. First image becomes the cover.</p>
        <div className="mt-4 grid grid-cols-3 sm:grid-cols-4 gap-3">
          {media.map((m) => (
            <div key={m.id} className="relative aspect-square rounded-xl overflow-hidden border border-white/10 bg-black/40">
              {m.media_type === "video" ? (
                <video src={m.url ?? undefined} className="h-full w-full object-cover" muted />
              ) : (
                m.url && <img src={m.url} alt="" className="h-full w-full object-cover" />
              )}
              <button
                type="button"
                onClick={() => removeMedia(m.id)}
                className="absolute top-1 right-1 h-6 w-6 rounded-full bg-black/70 text-white text-xs"
                aria-label="Remove"
              >×</button>
              {m.media_type === "video" && (
                <span className="absolute bottom-1 left-1 text-[10px] bg-black/70 text-white rounded px-1.5 py-0.5">VIDEO</span>
              )}
            </div>
          ))}
          <label className="aspect-square rounded-xl border border-dashed border-white/20 bg-white/5 grid place-items-center cursor-pointer hover:border-gold/40 hover:bg-gold/5 transition">
            <div className="text-center">
              <div className="text-2xl text-gold">＋</div>
              <div className="text-[10px] uppercase tracking-widest text-silver/70">Add media</div>
            </div>
            <input type="file" accept="image/*,video/*" multiple className="hidden" onChange={(e) => pickFiles(e.target.files)} />
          </label>
        </div>
      </section>

      <div className="hairline-gold" />

      {/* Core fields */}
      <section className="grid gap-4 sm:grid-cols-2">
        <F label="Title" required>
          <input className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} maxLength={140} placeholder="e.g. Porsche 911 Turbo S" />
        </F>
        <F label="Category" required>
          <select className="input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as CategoryKey })}>
            <option value="" className="bg-onyx">—</option>
            {CATEGORIES.map((c) => (
              <option key={c.key} value={c.key} className="bg-onyx">{c.icon} {CATEGORY_LABELS[c.key]}</option>
            ))}
          </select>
        </F>
        <F label="Brand"><input className="input" value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} /></F>
        <F label="Model"><input className="input" value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} /></F>
        <F label="Year"><input className="input" type="number" value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })} /></F>
        <F label="Condition">
          <select className="input" value={form.condition} onChange={(e) => setForm({ ...form, condition: e.target.value })}>
            <option value="" className="bg-onyx">—</option>
            {CONDITIONS.map((c) => <option key={c} value={c} className="bg-onyx capitalize">{c}</option>)}
          </select>
        </F>
        <F label="Country">
          <input list="pigm-countries" className="input" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} />
          <datalist id="pigm-countries">{COUNTRIES.map((c) => <option key={c} value={c} />)}</datalist>
        </F>
        <F label="City"><input className="input" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></F>
        <F label="Mileage (km)"><input className="input" type="number" min="0" value={form.mileage} onChange={(e) => setForm({ ...form, mileage: e.target.value })} /></F>
        <F label="Fuel">
          <select className="input" value={form.fuel} onChange={(e) => setForm({ ...form, fuel: e.target.value })}>
            <option value="" className="bg-onyx">—</option>
            {FUELS.map((f) => <option key={f} value={f} className="bg-onyx">{f}</option>)}
          </select>
        </F>
        <F label="Transmission">
          <select className="input" value={form.transmission} onChange={(e) => setForm({ ...form, transmission: e.target.value })}>
            <option value="" className="bg-onyx">—</option>
            {TRANSMISSIONS.map((f) => <option key={f} value={f} className="bg-onyx">{f}</option>)}
          </select>
        </F>
      </section>

      <F label="Description">
        <textarea rows={5} maxLength={4000} className="input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Describe the item, provenance, condition, service history…" />
      </F>

      <div className="hairline-gold" />

      {/* Pricing */}
      <section className="grid gap-4 sm:grid-cols-2">
        <F label="Price (USD)" required>
          <input className="input" type="number" step="0.01" min="0" value={form.price_usd} onChange={(e) => setForm({ ...form, price_usd: e.target.value })} placeholder="e.g. 100000" />
        </F>
        <div className="glass rounded-xl border border-gold/20 p-3">
          <p className="text-[10px] uppercase tracking-widest text-gold/80">Community GCV Reference</p>
          <p className="mt-1 text-sm text-silver/80">1 π = {GCV_USD_PER_PI.toLocaleString()} USD</p>
          <p className="mt-2 font-display text-2xl text-gradient-gold">≈ {piEquivalent.toLocaleString(undefined, { maximumFractionDigits: 6 })} π</p>
        </div>
        <label className="sm:col-span-2 flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3">
          <input type="checkbox" className="h-5 w-5 accent-[color:var(--gold)]" checked={form.negotiable} onChange={(e) => setForm({ ...form, negotiable: e.target.checked })} />
          <div>
            <p className="text-sm">Accept offers</p>
            <p className="text-xs text-silver/60">Let buyers send you offers and negotiate the price.</p>
          </div>
        </label>
      </section>

      <div className="hairline-gold" />

      {/* Contact */}
      <section className="grid gap-4 sm:grid-cols-2">
        <F label="Seller phone"><input className="input" value={form.seller_phone} onChange={(e) => setForm({ ...form, seller_phone: e.target.value })} /></F>
        <F label="Seller email"><input type="email" className="input" value={form.seller_email} onChange={(e) => setForm({ ...form, seller_email: e.target.value })} /></F>
      </section>

      <p className="text-[10px] leading-snug text-silver/60">
        Community GCV Reference (1 Pi = 314,159 USD) is a community ecosystem reference and is NOT an official Pi Network exchange rate.
      </p>

      {err && <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">{err}</div>}
      {msg && <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300">{msg}</div>}

      <div className="flex flex-wrap gap-2">
        <button disabled={busy} onClick={() => submit("active")} className="btn-gold rounded-full px-6 py-2.5 text-sm font-semibold disabled:opacity-60">
          {busy ? "Saving…" : initial ? "Save & publish" : "Publish listing"}
        </button>
        <button disabled={busy} onClick={() => submit("draft")} className="btn-ghost-silver rounded-full px-6 py-2.5 text-sm disabled:opacity-60">
          Save as draft
        </button>
      </div>

      <style>{`
        .input {
          width: 100%;
          border-radius: 0.75rem;
          border: 1px solid oklch(1 0 0 / 0.10);
          background: rgba(0,0,0,0.4);
          padding: 0.6rem 0.85rem;
          color: var(--silver);
          outline: none;
          font-size: 0.875rem;
        }
        .input:focus { border-color: oklch(0.82 0.14 85 / 0.6); box-shadow: 0 0 0 3px oklch(0.82 0.14 85 / 0.2); }
      `}</style>
    </div>
  );
}

function F({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] uppercase tracking-widest text-silver/70">
        {label}{required && <span className="text-gold ml-1">*</span>}
      </span>
      {children}
    </label>
  );
}
