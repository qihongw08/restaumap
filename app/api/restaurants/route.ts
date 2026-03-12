import { NextRequest, NextResponse } from "next/server";
import { prisma, dbSchema } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import type { RestaurantStatus } from "@prisma/client";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get("status");
    const excludeBlacklisted =
      searchParams.get("excludeBlacklisted") !== "false";
    const limitParam = searchParams.get("limit");
    const cursor = searchParams.get("cursor");
    const cuisine = searchParams.get("cuisine");
    const priceRange = searchParams.get("priceRange");
    const groupId = searchParams.get("groupId");
    const limit = Math.min(Math.max(Number(limitParam) || 10, 1), 50);

    // For cuisine filtering, first get matching restaurant IDs via raw SQL
    // (case-insensitive ILIKE on array elements — not expressible in Prisma)
    let cuisineRestaurantIds: string[] | undefined;
    if (cuisine) {
      const pattern = `%${cuisine}%`;
      const matches = await prisma.$queryRawUnsafe<{ id: string }[]>(
        `SELECT r.id FROM "${dbSchema}".restaurants r
         WHERE EXISTS (
           SELECT 1 FROM unnest(r.cuisine_types) AS ct
           WHERE ct ILIKE $1
         )`,
        pattern,
      );
      cuisineRestaurantIds = matches.map((m) => m.id);
      if (cuisineRestaurantIds.length === 0) {
        return NextResponse.json({ data: [], nextCursor: null });
      }
    }

    const userRestaurants = await prisma.userRestaurant.findMany({
      where: {
        userId: user.id,
        ...(status ? { status: status as RestaurantStatus } : {}),
        ...(excludeBlacklisted ? { isBlacklisted: false } : {}),
        ...(cuisineRestaurantIds || priceRange || groupId
          ? {
              restaurant: {
                ...(cuisineRestaurantIds
                  ? { id: { in: cuisineRestaurantIds } }
                  : {}),
                ...(priceRange ? { priceRange } : {}),
                ...(groupId ? { groupRestaurants: { some: { groupId } } } : {}),
              },
            }
          : {}),
      },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      orderBy: { savedAt: "desc" },
      include: {
        restaurant: {
          include: {
            visits: {
              where: { userId: user.id },
              orderBy: { visitDate: "desc" },
              take: 5,
              include: { photos: true },
            },
          },
        },
      },
    });

    userRestaurants.sort((a, b) => {
      const aVisited = a.status === "VISITED" ? 1 : 0;
      const bVisited = b.status === "VISITED" ? 1 : 0;
      return aVisited - bVisited;
    });

    const hasMore = userRestaurants.length > limit;
    const items = hasMore ? userRestaurants.slice(0, limit) : userRestaurants;

    const data = items.map((ur) => ({
      ...ur.restaurant,
      status: ur.status,
      isBlacklisted: ur.isBlacklisted,
      blacklistReason: ur.blacklistReason,
      blacklistedAt: ur.blacklistedAt,
      sourceUrl: ur.sourceUrl,
      sourcePlatform: ur.sourcePlatform,
      rawCaption: ur.rawCaption,
    }));

    const nextCursor = hasMore ? items[items.length - 1].id : null;

    return NextResponse.json({ data, nextCursor });
  } catch (error) {
    console.error("Get restaurants error:", error);
    return NextResponse.json(
      { error: "Failed to fetch restaurants" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const body = await request.json();
    const status = (body.status as RestaurantStatus) ?? "WANT_TO_GO";

    const restaurantData = {
      name: body.name,
      address: body.address ?? null,
      formattedAddress: body.formattedAddress ?? null,
      latitude: body.latitude ?? null,
      longitude: body.longitude ?? null,
      googlePlaceId: body.googlePlaceId ?? null,
      photoReferences: Array.isArray(body.photoReferences)
        ? body.photoReferences
        : [],
      openingHoursWeekdayText: body.openingHoursWeekdayText ?? [],
      cuisineTypes: body.cuisineTypes ?? [],
      popularDishes: body.popularDishes ?? [],
      priceRange: body.priceRange ?? null,
      ambianceTags: body.ambianceTags ?? [],
    };

    let restaurant;
    if (body.googlePlaceId) {
      restaurant = await prisma.restaurant.upsert({
        where: { googlePlaceId: body.googlePlaceId },
        create: restaurantData,
        update: {
          ...(body.formattedAddress ? { formattedAddress: body.formattedAddress } : {}),
          ...(body.latitude != null ? { latitude: body.latitude } : {}),
          ...(body.longitude != null ? { longitude: body.longitude } : {}),
          ...(restaurantData.photoReferences.length > 0 ? { photoReferences: restaurantData.photoReferences } : {}),
          ...(restaurantData.cuisineTypes.length > 0 ? { cuisineTypes: restaurantData.cuisineTypes } : {}),
          ...(restaurantData.popularDishes.length > 0 ? { popularDishes: restaurantData.popularDishes } : {}),
          ...(body.priceRange ? { priceRange: body.priceRange } : {}),
          ...(restaurantData.ambianceTags.length > 0 ? { ambianceTags: restaurantData.ambianceTags } : {}),
        },
      });
    } else {
      restaurant = await prisma.restaurant.create({ data: restaurantData });
    }

    // Upsert user-restaurant link (user might already have this restaurant saved)
    const userRestaurant = await prisma.userRestaurant.upsert({
      where: {
        userId_restaurantId: { userId: user.id, restaurantId: restaurant.id },
      },
      create: {
        userId: user.id,
        restaurantId: restaurant.id,
        status,
        sourceUrl: body.sourceUrl ?? null,
        sourcePlatform: body.sourcePlatform ?? null,
        rawCaption: body.rawCaption ?? null,
      },
      update: {
        status,
        ...(body.sourceUrl ? { sourceUrl: body.sourceUrl } : {}),
      },
    });

    const withVisits = await prisma.restaurant.findUnique({
      where: { id: restaurant.id },
      include: { visits: { orderBy: { visitDate: "desc" }, take: 5 } },
    });

    return NextResponse.json(
      {
        data: {
          ...withVisits!,
          status: userRestaurant.status,
          isBlacklisted: false,
          blacklistReason: null,
          blacklistedAt: null,
          sourceUrl: userRestaurant.sourceUrl,
          sourcePlatform: userRestaurant.sourcePlatform,
          rawCaption: userRestaurant.rawCaption,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Create restaurant error:", error);
    return NextResponse.json(
      { error: "Failed to create restaurant" },
      { status: 500 },
    );
  }
}
