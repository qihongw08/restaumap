import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const groupId = searchParams.get("groupId") || undefined;

    const minLat = searchParams.get("minLat");
    const maxLat = searchParams.get("maxLat");
    const minLng = searchParams.get("minLng");
    const maxLng = searchParams.get("maxLng");
    const hasBounds =
      minLat !== null &&
      maxLat !== null &&
      minLng !== null &&
      maxLng !== null &&
      !Number.isNaN(Number(minLat)) &&
      !Number.isNaN(Number(maxLat)) &&
      !Number.isNaN(Number(minLng)) &&
      !Number.isNaN(Number(maxLng));

    const limitParam = searchParams.get("limit");
    const cursor = searchParams.get("cursor");
    const limit = Math.min(Math.max(Number(limitParam) || 200, 1), 500);

    const items = await prisma.visit.findMany({
      where: {
        userId: user.id,
        ...(groupId ? { groupId } : {}),
        restaurant: {
          latitude: { not: null },
          longitude: { not: null },
          ...(hasBounds
            ? {
                latitude: {
                  gte: Number(minLat),
                  lte: Number(maxLat),
                },
                longitude: {
                  gte: Number(minLng),
                  lte: Number(maxLng),
                },
              }
            : {}),
        },
      },
      orderBy: { visitDate: "desc" },
      ...(hasBounds
        ? {}
        : {
            take: limit + 1,
            ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
          }),
      select: {
        id: true,
        restaurantId: true,
        visitDate: true,
        photos: { select: { url: true }, take: 1 },
        restaurant: {
          select: { id: true, name: true, latitude: true, longitude: true },
        },
      },
    });

    const hasMore = !hasBounds && items.length > limit;
    const page = hasBounds || !hasMore ? items : items.slice(0, limit);

    const data = page.map((v) => ({
      id: v.id,
      restaurantId: v.restaurantId,
      visitDate: v.visitDate.toISOString(),
      firstPhotoUrl: v.photos[0]?.url ?? null,
      restaurant: {
        id: v.restaurant.id,
        name: v.restaurant.name,
        latitude: v.restaurant.latitude!,
        longitude: v.restaurant.longitude!,
      },
    }));

    const nextCursor = hasBounds || !hasMore ? null : page[page.length - 1].id;

    return NextResponse.json({ data, nextCursor });
  } catch (error) {
    console.error("Get visit markers error:", error);
    return NextResponse.json(
      { error: "Failed to fetch visit markers" },
      { status: 500 },
    );
  }
}

