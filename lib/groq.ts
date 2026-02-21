import Groq from "groq-sdk";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

const EXTRACT_JSON_SCHEMA = `
Output requirements:
- Output valid JSON only
- No markdown, no explanation

Exact JSON structure:
{
"name": "restaurant name",
"address": "full address if known, else city/area or null",
"formattedAddress": "formatted address if known, else null",
"openingHoursWeekdayText": ["array", "of", "opening hours weekday text"],
"cuisineTypes": ["array", "of", "cuisines"],
"popularDishes": ["array", "of", "popular dishes"],
"priceRange": "$" | "$$" | "$$$" | "$$$$" | null,
"ambianceTags": ["array", "of", "tags"]
}`;

/** Instagram: one compound-mini call with caption + single web search → full JSON. */
const EXTRACT_SYSTEM_INSTAGRAM = `You are given the caption or text content from an Instagram post (reel, post, or story).
Do the following in order:
1. From the caption only, identify the restaurant or venue name (e.g. "went to", "checked in", "at [name]", location + venue). Ignore usernames and discovery hashtags.
2. Use web search once to find: full address, opening hours, cuisine types, popular dishes, price range, and ambiance for that restaurant.
3. Output the result as the exact JSON structure below.

${EXTRACT_JSON_SCHEMA}`;

/** Step 1 for Xiaohongshu: extract only name and rough location from post content (no tools). */
const XIAOHONGSHU_STEP1_SYSTEM = `You are given the link to a Xiaohongshu / Red Note post.
Your task is to extract only:
1. The restaurant or venue name (e.g. from "打卡 XX店", "在 YY 吃了", "法拉盛的 ZZ").
2. A rough location: city, area, neighborhood, or district if mentioned (e.g. "上海", "法拉盛", "曼哈顿"). Use null if no location is mentioned.

Ignore author handle, hashtags, and app UI. Treat the input as post content only.

Output requirements:
- Output valid JSON only. No markdown, no explanation.

Exact JSON structure:
{"name": "restaurant or venue name", "roughLocation": "city/area or null"}`;

/** Step 2 for Xiaohongshu: given name + rough location, use web search to fill full restaurant schema. */
const XIAOHONGSHU_STEP2_SYSTEM = `You are given a restaurant name and an optional rough location (city/area).
Use web search to find: full address, opening hours, cuisine types, popular dishes, price range, and ambiance.
Then output the result in the exact JSON structure below.

${EXTRACT_JSON_SCHEMA}`;

export interface ExtractedRestaurant {
  name: string;
  address: string | null;
  formattedAddress?: string | null;
  openingHoursWeekdayText?: string[];
  cuisineTypes: string[];
  popularDishes: string[];
  priceRange: string | null;
  ambianceTags: string[];
}

/** Step 1 Xiaohongshu result: name + rough location only. */
interface XiaohongshuStep1Result {
  name: string;
  roughLocation: string | null;
}

function parseExtractionResult(content: string): ExtractedRestaurant {
  const raw = content
    .replace(/^```(?:json)?\s*\n?/, "")
    .replace(/\n?```\s*$/, "")
    .trim();
  const parsed = JSON.parse(raw) as ExtractedRestaurant;

  return {
    name: parsed.name ?? "Unknown",
    address: parsed.address ?? null,
    formattedAddress: parsed.formattedAddress ?? parsed.address ?? null,
    openingHoursWeekdayText: Array.isArray(parsed.openingHoursWeekdayText)
      ? parsed.openingHoursWeekdayText
      : [],
    cuisineTypes: Array.isArray(parsed.cuisineTypes) ? parsed.cuisineTypes : [],
    popularDishes: Array.isArray(parsed.popularDishes)
      ? parsed.popularDishes
      : [],
    priceRange: parsed.priceRange ?? null,
    ambianceTags: Array.isArray(parsed.ambianceTags) ? parsed.ambianceTags : [],
  };
}

async function compoundMini(
  systemPrompt: string,
  userContent: string,
  enabledTool?: "web_search" | "code_interpreter" | "visit_website",
): Promise<string> {
  const message = systemPrompt + "\n\n" + userContent;

  const completion = await groq.chat.completions.create({
    model: "groq/compound-mini",
    messages: [{ role: "user", content: message }],
    temperature: 1,
    compound_custom: {
      tools: {
        enabled_tools: enabledTool ? [enabledTool] : [],
      },
    },
  });

  const content = completion.choices[0]?.message?.content?.trim();
  if (!content) {
    throw new Error("No response from Groq compound-mini");
  }
  return content;
}

function parseStep1Result(content: string): XiaohongshuStep1Result {
  const raw = content
    .replace(/^```(?:json)?\s*\n?/, "")
    .replace(/\n?```\s*$/, "")
    .trim();
  const parsed = JSON.parse(raw) as {
    name?: string;
    roughLocation?: string | null;
  };
  return {
    name: parsed.name ?? "Unknown",
    roughLocation: parsed.roughLocation ?? null,
  };
}

export async function extractRestaurantFromInstagram(
  text: string,
): Promise<ExtractedRestaurant> {
  const content = await compoundMini(
    EXTRACT_SYSTEM_INSTAGRAM,
    "Instagram post caption:\n" + text,
    "web_search",
  );
  return parseExtractionResult(content);
}

export async function extractRestaurantFromXiaohongshu(
  text: string,
): Promise<ExtractedRestaurant> {
  const step1Content = await compoundMini(
    XIAOHONGSHU_STEP1_SYSTEM,
    "Input (post content or link):\n" + text,
    undefined,
  );
  const { name, roughLocation } = parseStep1Result(step1Content);

  const step2Input = roughLocation
    ? `Restaurant name: ${name}\nRough location: ${roughLocation}`
    : `Restaurant name: ${name}`;
  const step2Content = await compoundMini(
    XIAOHONGSHU_STEP2_SYSTEM,
    step2Input,
    "web_search",
  );
  return parseExtractionResult(step2Content);
}
