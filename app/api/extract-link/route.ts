import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import {
  extractRestaurantFromInstagram,
  extractRestaurantFromXiaohongshu,
} from "@/lib/groq";
import {
  isInstagramUrl,
  normalizeInstagramUrl,
  getInstagramCaption,
} from "@/lib/instagram";

async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch {
    try {
      return await fn();
    } catch (second) {
      console.error("Extract retry failed:", second);
      throw second;
    }
  }
}

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

    function isXiaohongshuUrl(raw: string): boolean {
      return raw.includes("xhslink.com");
    }

    if (isInstagramUrl(raw)) {
      const normalized = normalizeInstagramUrl(raw) ?? raw;
      const result = await getInstagramCaption(normalized);
      const text = result.caption?.trim();

      if (!text) {
        return NextResponse.json(
          { error: "Could not extract caption from Instagram post" },
          { status: 400 },
        );
      }

      const extracted = await withRetry(() =>
        extractRestaurantFromInstagram(text),
      );
      return NextResponse.json({ data: extracted });
    } else if (isXiaohongshuUrl(raw)) {
      const extracted = await withRetry(() =>
        extractRestaurantFromXiaohongshu(raw),
      );
      return NextResponse.json({ data: extracted });
    } else {
      return NextResponse.json(
        { error: "Only Instagram and Xiaohongshu URLs are supported" },
        { status: 400 },
      );
    }
  } catch (error) {
    console.error("Extract link error:", error);
    return NextResponse.json(
      { error: "Failed to extract restaurant info" },
      { status: 500 },
    );
  }
}
