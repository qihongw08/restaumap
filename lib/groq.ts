import Groq from "groq-sdk";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

const EXTRACT_SYSTEM = `You are given raw text extracted from a social media post (Instagram, TikTok, RedNote/Xiaohongshu). 
    Your task is to extract restaurant information, not user or creator information.

    Important rules:
    1. First, translate all non-English text into English.
    2.Identify the restaurant name by prioritizing:
    3. Phrases that indicate visiting, eating at, or checking in (e.g. “went to”, “checked in”, “打卡”, “吃了”, “新开业”).
    4. Names that appear after location indicators (city/neighborhood names).

    Do NOT treat usernames, account names, or authors as restaurant names, even if they appear prominently or repeatedly.
    If a personal name or handle appears (e.g. above the post or near profile info), assume it is NOT the restaurant unless the text explicitly states it is a restaurant.
    After identifying the restaurant name and rough location (city, neighborhood, street, or address), use your general knowledge to infer:
    - Cuisine type
    - Typical price range
    - Common or likely popular dishes
    - Ambiance

    Prefer information explicitly stated in the text. If missing, infer conservatively based on the restaurant name, cuisine, and area.
    Output valid JSON only, no explanation, no markdown.

    Exact JSON structure:
    {
    "name": "restaurant name",
    "address": "full address if known, else city/area or null",
    "cuisineTypes": ["array", "of", "cuisines"],
    "popularDishes": ["array", "of", "popular dishes"],
    "priceRange": "$" | "$$" | "$$$" | "$$$$" | null,
    "ambianceTags": ["array", "of", "tags"]
    }

    Always set "name".`;

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
    model: "groq/compound",
    messages: [{ role: "user", content: EXTRACT_SYSTEM + "\n\n" + text }],
    temperature: 1,
    compound_custom: {
      tools: {
        enabled_tools: ["web_search", "code_interpreter", "visit_website"],
      },
    },
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
