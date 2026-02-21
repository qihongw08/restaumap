import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

/**
 * Create a restaurant from an import. Expects placeId and extracted data (and
 * optionally place details) to be already fetched by the client. Creates/updates
 * by googlePlaceId and an Import row with sourceUrl and importedAt.
 */
export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = await request.json();
    const sourceUrl =
      typeof body.sourceUrl === "string" ? body.sourceUrl : null;
    const placeId = body.placeId ?? null;
    const extracted = body.extracted ?? {};

    const name = extracted.name ?? "Unknown";
    const address = extracted.address ?? null;
    const rawCaption =
      typeof extracted.rawCaption === "string" ? extracted.rawCaption : null;
    const sourcePlatform =
      typeof body.sourcePlatform === "string" ? body.sourcePlatform : null;
    const cuisineTypes = Array.isArray(extracted.cuisineTypes)
      ? extracted.cuisineTypes
      : [];
    const popularDishes = Array.isArray(extracted.popularDishes)
      ? extracted.popularDishes
      : [];
    const priceRange = extracted.priceRange ?? null;
    const ambianceTags = Array.isArray(extracted.ambianceTags)
      ? extracted.ambianceTags
      : [];

    let restaurantId: string;
    const rawFormatted =
      typeof body.formattedAddress === "string"
        ? body.formattedAddress
        : typeof extracted.formattedAddress === "string"
          ? extracted.formattedAddress
          : address;
    const formattedAddress: string | null = rawFormatted ?? null;
    const latitude: number | null =
      typeof body.latitude === "number" ? body.latitude : null;
    const longitude: number | null =
      typeof body.longitude === "number" ? body.longitude : null;
    const googlePlaceId: string | null =
      typeof placeId === "string" && placeId.trim() ? placeId.trim() : null;
    const photoReferences: string[] = Array.isArray(body.photoReferences)
      ? (body.photoReferences as unknown[]).filter(
          (p): p is string => typeof p === "string",
        )
      : [];
    const openingHoursWeekdayText: string[] = Array.isArray(
      extracted.openingHoursWeekdayText,
    )
      ? extracted.openingHoursWeekdayText
      : [];

    if (googlePlaceId) {
      const existing = await prisma.restaurant.findUnique({
        where: { googlePlaceId },
      });

      if (existing) {
        restaurantId = existing.id;
        const needsCoords =
          latitude != null &&
          longitude != null &&
          (existing.latitude == null || existing.longitude == null);
        const needsUpdate =
          (photoReferences.length > 0 &&
            (existing.photoReferences?.length ?? 0) === 0) ||
          (openingHoursWeekdayText.length > 0 &&
            (existing.openingHoursWeekdayText?.length ?? 0) === 0) ||
          needsCoords;
        if (needsUpdate) {
          await prisma.restaurant.update({
            where: { id: existing.id },
            data: {
              ...(photoReferences.length > 0 &&
              (existing.photoReferences?.length ?? 0) === 0
                ? { photoReferences }
                : {}),
              ...(openingHoursWeekdayText.length > 0 &&
              (existing.openingHoursWeekdayText?.length ?? 0) === 0
                ? { openingHoursWeekdayText }
                : {}),
              ...(needsCoords && latitude != null && longitude != null
                ? { latitude, longitude }
                : {}),
            },
          });
        }
      } else {
        const created = await prisma.restaurant.create({
          data: {
            name,
            address,
            formattedAddress,
            latitude,
            longitude,
            googlePlaceId,
            photoReferences,
            openingHoursWeekdayText,
            cuisineTypes,
            popularDishes,
            priceRange,
            ambianceTags,
          },
        });
        restaurantId = created.id;
      }
    } else {
      const created = await prisma.restaurant.create({
        data: {
          name,
          address,
          formattedAddress,
          latitude,
          longitude,
          cuisineTypes,
          popularDishes,
          priceRange,
          ambianceTags,
          openingHoursWeekdayText,
        },
      });
      restaurantId = created.id;
    }

    await prisma.userRestaurant.upsert({
      where: { userId_restaurantId: { userId: user.id, restaurantId } },
      create: {
        userId: user.id,
        restaurantId,
        status: "WANT_TO_GO",
        sourceUrl: sourceUrl || null,
        sourcePlatform,
        rawCaption,
      },
      update: {
        sourceUrl: sourceUrl ?? null,
        sourcePlatform,
        rawCaption,
      },
    });

    await prisma["import"].create({
      data: {
        sourceUrl: sourceUrl || null,
        restaurantId,
        userId: user.id,
      },
    });

    const restaurant = await prisma.restaurant.findUnique({
      where: { id: restaurantId },
      include: {
        visits: { where: { userId: user.id } },
      },
    });
    const ur = await prisma.userRestaurant.findUnique({
      where: { userId_restaurantId: { userId: user.id, restaurantId } },
    });

    return NextResponse.json(
      {
        data: {
          ...restaurant!,
          status: ur!.status,
          isBlacklisted: ur!.isBlacklisted,
          blacklistReason: ur!.blacklistReason,
          blacklistedAt: ur!.blacklistedAt,
          sourceUrl: ur!.sourceUrl,
          sourcePlatform: ur!.sourcePlatform,
          rawCaption: ur!.rawCaption,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Import error:", error);
    return NextResponse.json(
      { error: "Failed to save import" },
      { status: 500 },
    );
  }
}
