import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

/**
 * Known cuisine keywords — used to normalize raw cuisine strings like
 * "Authentic Chinese Food" → "Chinese", "Korean BBQ" → "Korean".
 * Order matters: first match wins, so more specific terms come first.
 */
const CUISINE_KEYWORDS = [
  "Mexican",
  "Japanese",
  "Chinese",
  "Korean",
  "Thai",
  "Vietnamese",
  "Indian",
  "Italian",
  "French",
  "Mediterranean",
  "Greek",
  "Turkish",
  "Middle Eastern",
  "American",
  "Southern",
  "Cajun",
  "Hawaiian",
  "Caribbean",
  "Brazilian",
  "Peruvian",
  "Ethiopian",
  "Moroccan",
  "Spanish",
  "Filipino",
  "Malaysian",
  "Indonesian",
  "Taiwanese",
  "Pizza",
  "Sushi",
  "Ramen",
  "Pho",
  "Tacos",
  "BBQ",
  "Burger",
  "Steak",
  "Seafood",
  "Vegan",
  "Vegetarian",
  "Brunch",
  "Bakery",
  "Dessert",
  "Cafe",
  "Coffee",
  "Tea",
  "Bar",
  "Pub",
  "Dim Sum",
  "Hot Pot",
  "Noodle",
  "Curry",
  "Tapas",
  "Deli",
  "Soul Food",
  "Fusion",
];

/** Extract the primary cuisine keyword from a raw string */
function normalizeCuisine(raw: string): string {
  const lower = raw.toLowerCase();
  for (const keyword of CUISINE_KEYWORDS) {
    if (lower.includes(keyword.toLowerCase())) {
      return keyword;
    }
  }
  // No known keyword matched — use the raw string, title-cased
  return raw.trim();
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const restaurants = await prisma.userRestaurant.findMany({
      where: { userId: user.id, isBlacklisted: false },
      select: { restaurant: { select: { cuisineTypes: true } } },
      orderBy: { restaurant: { cuisineTypes: "asc" } },
    });

    const cuisineSet = new Set<string>();
    for (const ur of restaurants) {
      for (const c of ur.restaurant.cuisineTypes) {
        cuisineSet.add(normalizeCuisine(c));
      }
    }

    const data = [...cuisineSet].sort();
    return NextResponse.json({ data });
  } catch (error) {
    console.error("Get cuisines error:", error);
    return NextResponse.json(
      { error: "Failed to fetch cuisines" },
      { status: 500 },
    );
  }
}
