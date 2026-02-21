import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { searchPlaces } from "@/lib/places";

function extractCityStateZip(address: string): string {
  const parts = address
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length <= 2) return address.trim();
  return parts.slice(-2).join(", ");
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = await request.json();
    const name = body.name ?? "";
    const addressOrRegion = extractCityStateZip(body.addressOrRegion) ?? "";
    const query = [name, addressOrRegion].filter(Boolean).join(", ");
    if (!query.trim()) {
      return NextResponse.json(
        { error: "Missing name or addressOrRegion" },
        { status: 400 },
      );
    }

    const candidates = await searchPlaces(query);
    console.log("candidates: ", candidates);
    return NextResponse.json({ data: candidates });
  } catch (error) {
    console.error("Places search error:", error);
    return NextResponse.json(
      { error: "Failed to search places" },
      { status: 500 },
    );
  }
}
