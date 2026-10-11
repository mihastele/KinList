/**
 * Gift suggester.
 *
 * Two tiers:
 *  1. HEURISTIC (default, free, offline): rule-based ideas from the person's
 *     likes/dislikes + budget + occasion. Good enough to demo and to seed the UX.
 *  2. AI (optional): if AI_API_URL + AI_API_KEY are set, POST an OpenAI-compatible
 *     chat-completions request with a tight prompt asking for JSON gift ideas.
 *
 * The heuristic tier is deliberately written so it CAN be swapped for an LLM
 * call without changing the API shape (same input, same output).
 */
import type { Person } from "@prisma/client";

export interface SuggestInput {
  person: Pick<Person, "name" | "relation" | "likes" | "dislikes" | "notes">;
  occasionName?: string;
  budget?: number | null;
  currency?: string;
  count?: number;
}

export interface GiftIdea {
  title: string;
  description: string;
  /// Rough price estimate.
  price: number;
  currency: string;
  /// Why this fits the person (short reason).
  reason: string;
}

const CURATED: Record<string, { title: string; desc: string; price: number }[]> = {
  coffee: [
    { title: "Specialty coffee subscription (3 months)", desc: "Freshly roasted beans delivered monthly.", price: 45 },
    { title: "Pour-over coffee maker set", desc: "Ceramic dripper, filters and a gooseneck kettle.", price: 60 },
  ],
  cooking: [
    { title: "Chef's knife (8 inch)", desc: "A good knife makes cooking a joy.", price: 80 },
    { title: "Cast iron skillet", desc: "Lasts a lifetime, sears beautifully.", price: 35 },
  ],
  books: [
    { title: "Bestselling novel + bookmark set", desc: "Wrap it with a handwritten note.", price: 25 },
    { title: "Bookstore gift card", desc: "Let them pick exactly what they want.", price: 40 },
  ],
  music: [
    { title: "Vinyl record of their favourite album", desc: "A tangible piece of their music taste.", price: 30 },
    { title: "Concert tickets", desc: "An experience they'll remember.", price: 90 },
  ],
  garden: [
    { title: "Indoor plant starter kit", desc: "Easy-care plants with pots and a guide.", price: 35 },
    { title: "Gardening tool set", desc: "Trowel, pruners and gloves in a tote.", price: 45 },
  ],
  fitness: [
    { title: "Yoga mat + strap set", desc: "Thick, grippy, travel-friendly.", price: 40 },
    { title: "Fitness tracker band", desc: "Tracks sleep, steps and workouts.", price: 60 },
  ],
  tech: [
    { title: "Wireless earbuds", desc: "Great for commutes and workouts.", price: 70 },
    { title: "Portable charger (20,000 mAh)", desc: "Never run out of battery again.", price: 35 },
  ],
  games: [
    { title: "Board game (cooperative or party)", desc: "Great for game nights with friends/family.", price: 35 },
    { title: "Puzzle (1000 pieces)", desc: "A calm, satisfying evening activity.", price: 20 },
  ],
  outdoors: [
    { title: "Insulated water bottle", desc: "Keeps drinks cold for 24h.", price: 30 },
    { title: "National parks annual pass", desc: "A year of adventures.", price: 80 },
  ],
  art: [
    { title: "Quality sketchbook + pencils", desc: "For drawing, journaling or planning.", price: 25 },
    { title: "DIY craft kit", desc: "Candle-making, pottery or embroidery kit.", price: 35 },
  ],
  travel: [
    { title: "Travel pillow + eye mask set", desc: "Comfort on long flights.", price: 25 },
    { title: "Scratch-off world map", desc: "Track the places you've been.", price: 20 },
  ],
  pets: [
    { title: "Premium pet bed", desc: "Cozy spot they'll actually use.", price: 50 },
    { title: "Interactive pet toy set", desc: "Keeps them busy while you're away.", price: 25 },
  ],
  wellness: [
    { title: "Aromatherapy diffuser set", desc: "Calm evenings with essential oils.", price: 35 },
    { title: "Weighted blanket (light)", desc: "Better sleep in minutes.", price: 60 },
  ],
  food: [
    { title: "Artisan chocolate tasting box", desc: "A flight of single-origin chocolates.", price: 30 },
    { title: "Gourmet hot sauce set", desc: "For the heat lover.", price: 25 },
  ],
};

const GENERIC: { title: string; desc: string; price: number }[] = [
  { title: "Gift card to their favourite store", desc: "Always a safe, appreciated choice.", price: 50 },
  { title: "Fancy candle set", desc: "A nice scent for their home.", price: 30 },
  { title: "Personalised photo book", desc: "Print a year of memories into a book.", price: 35 },
  { title: "Cooking class voucher", desc: "A fun experience + a skill.", price: 75 },
  { title: "Subscription box (3 months)", desc: "A surprise each month.", price: 60 },
];

function normalize(s: string): string {
  return s.toLowerCase();
}

function matchLikes(likes: string[], dislikes: string[]): string[] {
  const all = [...likes, ...normalize(dislikes.join(" "))];
  const keys: string[] = [];
  const hay = all.join(" ").toLowerCase();
  for (const key of Object.keys(CURATED)) {
    if (hay.includes(key)) keys.push(key);
  }
  // common synonyms
  if (/cycl|bike/.test(hay) && !keys.includes("outdoors")) keys.push("outdoors");
  if (/dog|cat|pet/.test(hay) && !keys.includes("pets")) keys.push("pets");
  if (/read|novel|author/.test(hay) && !keys.includes("books")) keys.push("books");
  if (/gym|run|workout|sport/.test(hay) && !keys.includes("fitness")) keys.push("fitness");
  if (/cook|bake|chef|kitchen/.test(hay) && !keys.includes("cooking")) keys.push("cooking");
  if (/garden|plant|flower/.test(hay) && !keys.includes("garden")) keys.push("garden");
  if (/hobby|craft|diy|art|paint|draw/.test(hay) && !keys.includes("art")) keys.push("art");
  if (/game|puzzle|board/.test(hay) && !keys.includes("games")) keys.push("games");
  if (/music|vinyl|concert|band/.test(hay) && !keys.includes("music")) keys.push("music");
  if (/travel|trip|vacation|flight/.test(hay) && !keys.includes("travel")) keys.push("travel");
  if (/relax|spa|sleep|calm/.test(hay) && !keys.includes("wellness")) keys.push("wellness");
  return keys;
}

/** Built-in heuristic suggester (no network). */
export function heuristicSuggest(input: SuggestInput): GiftIdea[] {
  const { person, budget, currency = "USD", count = 5 } = input;
  const keys = matchLikes(person.likes, person.dislikes);
  const pool = keys.length ? keys.flatMap((k) => CURATED[k]) : GENERIC;

  let ideas: GiftIdea[] = pool.map((p) => ({
    title: p.title,
    description: p.desc,
    price: p.price,
    currency,
    reason: keys.length
      ? `Matches their interest in ${keys.slice(0, 2).join(" & ")}.`
      : "A versatile, crowd-pleasing pick.",
  }));

  // Avoid dislikes: token-aware filter with simple stemming.
  // "scented candles" → tokens {"scented", "candl"} so "candle"/"candles" both match.
  const stem = (w: string) => w.replace(/(ies|es|s)$/, "").replace(/^(.+[^aeiou])y$/, "$1i");
  const dis = person.dislikes
    .map(normalize)
    .flatMap((d) => d.split(/\s+/).filter((w) => w.length >= 4))
    .map(stem);
  const matchesDislike = (text: string) => {
    const t = normalize(text);
    return dis.some((d) => t.includes(d));
  };
  ideas = ideas.filter(
    (i) => !matchesDislike(i.title) && !matchesDislike(i.description),
  );

  // Budget clamp: prefer ideas under budget; if none, keep cheapest few.
  if (budget && budget > 0) {
    const under = ideas.filter((i) => i.price <= budget);
    if (under.length >= 2) ideas = under;
    ideas = ideas.sort((a, b) => Math.abs(a.price - budget) - Math.abs(b.price - budget));
  }

  // De-dup by title, take top N.
  const seen = new Set<string>();
  const out: GiftIdea[] = [];
  for (const i of ideas) {
    if (seen.has(i.title)) continue;
    seen.add(i.title);
    out.push(i);
    if (out.length >= count) break;
  }
  // Fill with generic if we ran out — but still respect dislikes.
  if (out.length < count) {
    for (const g of GENERIC) {
      if (out.length >= count) break;
      if (seen.has(g.title)) continue;
      // Re-check dislikes on generic fill too.
      if (matchesDislike(g.title) || matchesDislike(g.desc)) continue;
      out.push({ title: g.title, description: g.desc, price: g.price, currency, reason: "A safe, universally-liked option." });
    }
  }
  return out;
}

/** AI suggester — OpenAI-compatible chat completions. Returns null if not configured. */
export async function aiSuggest(input: SuggestInput): Promise<GiftIdea[] | null> {
  const url = process.env.AI_API_URL;
  const key = process.env.AI_API_KEY;
  const model = process.env.AI_MODEL || "gpt-4o-mini";
  if (!url || !key) return null;

  const budgetNote = input.budget ? `with a budget of about ${input.budget} ${input.currency ?? "USD"}` : "with no strict budget";
  const sys = [
    "You are a thoughtful gift advisor. Suggest practical, specific gift ideas.",
    "Respond ONLY with a JSON array of objects: {\"title\": string, \"description\": string, \"price\": number, \"currency\": string, \"reason\": string}.",
    "Avoid anything the person dislikes. Keep ideas concrete (brand/model optional).",
  ].join(" ");
  const user = [
    `Suggest ${input.count ?? 5} gift ideas for ${input.person.name}`,
    input.person.relation ? `who is my ${input.person.relation}` : "",
    input.occasionName ? `for the occasion \"${input.occasionName}\"` : "",
    budgetNote,
    input.person.likes.length ? `They LIKE: ${input.person.likes.join(", ")}.` : "",
    input.person.dislikes.length ? `They DISLIKE: ${input.person.dislikes.join(", ")}. Do not suggest these.` : "",
    input.person.notes ? `Extra notes: ${input.person.notes}` : "",
  ].filter(Boolean).join("\n");

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model,
        temperature: 0.7,
        messages: [
          { role: "system", content: sys },
          { role: "user", content: user },
        ],
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const text: string = data?.choices?.[0]?.message?.content ?? "";
    const match = text.match(/\[\s*\S[\s\S]*\]/);
    if (!match) return null;
    const parsed = JSON.parse(match[0]);
    if (!Array.isArray(parsed)) return null;
    return parsed
      .filter((p) => p && typeof p.title === "string")
      .map((p) => ({
        title: String(p.title),
        description: String(p.description ?? ""),
        price: Number(p.price ?? 0),
        currency: String(p.currency ?? input.currency ?? "USD"),
        reason: String(p.reason ?? ""),
      }));
  } catch {
    return null;
  }
}

/** Unified entry: try AI first, fall back to heuristic. */
export async function suggestGifts(input: SuggestInput): Promise<{ ideas: GiftIdea[]; source: "ai" | "heuristic" }> {
  const ai = await aiSuggest(input);
  if (ai && ai.length) return { ideas: ai, source: "ai" };
  return { ideas: heuristicSuggest(input), source: "heuristic" };
}
