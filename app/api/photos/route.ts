import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { visitId, restaurantId, urls } = await request.json();

    if (
      !visitId ||
      !restaurantId ||
      !Array.isArray(urls) ||
      urls.length === 0
    ) {
      return NextResponse.json(
        { error: "visitId, restaurantId, and urls[] required" },
        { status: 400 },
      );
    }

    const visit = await prisma.visit.findUnique({ where: { id: visitId } });
    if (!visit || visit.userId !== user.id) {
      return NextResponse.json(
        { error: "Visit not found" },
        { status: 404 },
      );
    }

    const validUrls = urls.filter(
      (u: unknown): u is string => typeof u === "string" && u.length > 0,
    );

    await prisma.photo.createMany({
      data: validUrls.map((url: string) => ({
        userId: user.id,
        restaurantId,
        visitId,
        url,
      })),
    });

    return NextResponse.json({ data: { count: validUrls.length } });
  } catch (error) {
    console.error("Create photos error:", error);
    return NextResponse.json(
      { error: "Failed to create photos" },
      { status: 500 },
    );
  }
}
