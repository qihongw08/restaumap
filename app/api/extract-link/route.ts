import { NextRequest, NextResponse } from "next/server";
import { extractRestaurantFromText } from "@/lib/groq";
import { fetchWebpageContent, isFetchableUrl } from "@/lib/anchorbrowser";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const raw = (body.text ?? body.url ?? body.caption ?? "").trim();
    if (!raw) {
      return NextResponse.json(
        { error: "Missing text, url, or caption in body" },
        { status: 400 },
      );
    }

    const textForExtraction = isFetchableUrl(raw)
      ? await fetchWebpageContent(raw)
      : raw;

    const extracted = await extractRestaurantFromText(textForExtraction);
    return NextResponse.json({ data: extracted });
  } catch (error) {
    console.error("Extract link error:", error);
    return NextResponse.json(
      { error: "Failed to extract restaurant info" },
      { status: 500 },
    );
  }
}
