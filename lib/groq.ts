import Groq from "groq-sdk";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

const EXTRACT_SYSTEM = `You are given text that may be scraped page content (markdown) or a pasted caption. Your job is to output structured restaurant information.

Steps:
1. Identify the restaurant name and any rough location from the text (city, neighborhood, street, or full address). These are your anchors.
2. Fetch the restaurant using that name and location, fill the output. Do not rely only on what is explicitly in the text: use your knowledge to look up or infer details about this restaurant (or similar places in that area). For example, if the text only gives a name and city, infer plausible cuisine type, price range, and ambiance from what you know about the restaurant or the area. Prefer information stated in the text when present; otherwise infer sensibly.
3. Output valid JSON only, no markdown or explanation. Use English for all fields (translate if the source is in another language).

Exact JSON structure:
{
  "name": "restaurant name",
  "address": "full address if known, else city/area or null",
  "cuisineTypes": ["array", "of", "cuisines"],
  "popularDishes": ["array", "of", "popular dishes"],
  "priceRange": "$" | "$$" | "$$$" | "$$$$" or null,
  "ambianceTags": ["array", "of", "tags like cozy, date night"]
}
Use null or empty array only when you cannot infer a value. Always set name.`;

export interface ExtractedRestaurant {
  name: string;
  address: string | null;
  cuisineTypes: string[];
  popularDishes: string[];
  priceRange: string | null;
  ambianceTags: string[];
}

export async function extractRestaurantFromText(
  text: string,
): Promise<ExtractedRestaurant> {
  const completion = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [
      { role: "system", content: EXTRACT_SYSTEM },
      { role: "user", content: text },
    ],
    temperature: 0.2,
  });

  let content = completion.choices[0]?.message?.content?.trim();
  if (!content) {
    throw new Error("No extraction result from Groq");
  }
  // Strip markdown code fences if present (e.g. ```json ... ```)
  content = content
    .replace(/^```(?:json)?\s*\n?/, "")
    .replace(/\n?```\s*$/, "")
    .trim();

  const parsed = JSON.parse(content) as ExtractedRestaurant;
  return {
    name: parsed.name ?? "Unknown",
    address: parsed.address ?? null,
    cuisineTypes: Array.isArray(parsed.cuisineTypes) ? parsed.cuisineTypes : [],
    popularDishes: Array.isArray(parsed.popularDishes)
      ? parsed.popularDishes
      : [],
    priceRange: parsed.priceRange ?? null,
    ambianceTags: Array.isArray(parsed.ambianceTags) ? parsed.ambianceTags : [],
  };
}
