import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import type { MarkerData } from "@/types/restaurant";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const groupId = request.nextUrl.searchParams.get("groupId") || undefined;

    const userRestaurants = await prisma.userRestaurant.findMany({
      where: {
        userId: user.id,
        isBlacklisted: false,
        ...(groupId
          ? {
              restaurant: {
                groupRestaurants: { some: { groupId } },
              },
            }
          : {}),
      },
      select: {
        status: true,
        restaurant: {
          select: {
            id: true,
            name: true,
            latitude: true,
            longitude: true,
          },
        },
      },
    });

    const data: MarkerData[] = userRestaurants.map((ur) => ({
      id: ur.restaurant.id,
      name: ur.restaurant.name,
      latitude: ur.restaurant.latitude,
      longitude: ur.restaurant.longitude,
      status: ur.status,
    }));

    return NextResponse.json({ data });
  } catch (error) {
    console.error("Get markers error:", error);
    return NextResponse.json(
      { error: "Failed to fetch markers" },
      { status: 500 },
    );
  }
}
