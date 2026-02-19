import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { extractRestaurantFromText } from "@/lib/groq";

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = await request.json();
    const raw = (body.text ?? body.url ?? body.caption ?? "").trim();
    if (!raw) {
      return NextResponse.json(
        { error: "Missing text, url, or caption in body" },
        { status: 400 },
      );
    }

    const extracted = await extractRestaurantFromText(raw);
    return NextResponse.json({ data: extracted });
  } catch (error) {
    console.error("Extract link error:", error);
    return NextResponse.json(
      { error: "Failed to extract restaurant info" },
      { status: 500 },
    );
  }
}
