import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const InputSchema = z.object({ query: z.string().min(1).max(500) });

export type SmartFilters = {
  q?: string;
  category?: string;
  brand?: string;
  model?: string;
  country?: string;
  city?: string;
  condition?: string;
  priceMin?: string;
  priceMax?: string;
  verified?: boolean;
  sort?: "newest" | "price_asc" | "price_desc" | "most_viewed" | "featured";
};

const CATEGORIES = [
  "vehicles", "electronics", "realestate", "luxury", "services",
  "motorcycles", "boats", "trucks", "heavy-equipment", "art-collectibles",
];

const SYSTEM = `You are a search-query parser for the Pi Global Marketplace.
Convert a user's natural-language shopping query into a JSON object of filters.
Valid categories: ${CATEGORIES.join(", ")}.
Fields (all optional): q (short keyword phrase), category, brand, model, country, city,
condition ("new" | "used" | "certified"), priceMin (USD, string), priceMax (USD, string),
verified (boolean), sort ("newest" | "price_asc" | "price_desc" | "most_viewed" | "featured").
Interpret vague budgets ("under 50k" -> priceMax "50000", "affordable" -> priceMax "10000",
"luxury"/"premium"/"high-end" -> sort "price_desc"). Return ONLY JSON, no prose.`;

export const smartSearch = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data }): Promise<SmartFilters> => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Missing LOVABLE_API_KEY");

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: data.query },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (res.status === 429) throw new Error("Rate limit exceeded. Please try again shortly.");
    if (res.status === 402) throw new Error("AI credits exhausted. Please add credits to continue.");
    if (!res.ok) throw new Error(`Smart search failed (${res.status})`);

    const json = await res.json();
    const raw = json?.choices?.[0]?.message?.content ?? "{}";
    let parsed: SmartFilters;
    try { parsed = JSON.parse(raw); } catch { parsed = {}; }

    // Sanitize
    const out: SmartFilters = {};
    if (typeof parsed.q === "string") out.q = parsed.q.slice(0, 120);
    if (typeof parsed.category === "string" && CATEGORIES.includes(parsed.category)) out.category = parsed.category;
    if (typeof parsed.brand === "string") out.brand = parsed.brand.slice(0, 60);
    if (typeof parsed.model === "string") out.model = parsed.model.slice(0, 60);
    if (typeof parsed.country === "string") out.country = parsed.country.slice(0, 60);
    if (typeof parsed.city === "string") out.city = parsed.city.slice(0, 60);
    if (parsed.condition === "new" || parsed.condition === "used" || parsed.condition === "certified") out.condition = parsed.condition;
    if (parsed.priceMin != null) out.priceMin = String(parsed.priceMin);
    if (parsed.priceMax != null) out.priceMax = String(parsed.priceMax);
    if (typeof parsed.verified === "boolean") out.verified = parsed.verified;
    const validSorts = ["newest", "price_asc", "price_desc", "most_viewed", "featured"] as const;
    if (parsed.sort && (validSorts as readonly string[]).includes(parsed.sort)) out.sort = parsed.sort;
    return out;
  });
