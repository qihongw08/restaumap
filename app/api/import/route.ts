import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getPlaceDetails } from '@/lib/places';
import { geocodeAddress } from '@/lib/maps';

/**
 * Create a restaurant from an import (link + optional Google Place).
 * If placeId is provided, we fetch Place Details and create/update by googlePlaceId.
 * We always create an Import row with sourceUrl and importedAt.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const sourceUrl =
      typeof body.sourceUrl === 'string' ? body.sourceUrl : null;
    const placeId = body.placeId ?? null;
    const extracted = body.extracted ?? {};

    const name = extracted.name ?? 'Unknown';
    const address = extracted.address ?? null;
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
    let formattedAddress: string | null = address;
    let latitude: number | null = null;
    let longitude: number | null = null;
    let googlePlaceId: string | null = null;
    let photoReferences: string[] = [];

    if (placeId) {
      const details = await getPlaceDetails(placeId);
      googlePlaceId = details.placeId;
      formattedAddress = details.formattedAddress;
      latitude = details.latitude;
      longitude = details.longitude;
      photoReferences = details.photoReferences;
      const openingHoursWeekdayText = details.openingHoursWeekdayText ?? [];

      const existing = await prisma.restaurant.findUnique({
        where: { googlePlaceId },
      });

      if (existing) {
        restaurantId = existing.id;
        const needsUpdate =
          (photoReferences.length > 0 && (existing.photoReferences?.length ?? 0) === 0) ||
          (openingHoursWeekdayText.length > 0 && (existing.openingHoursWeekdayText?.length ?? 0) === 0);
        if (needsUpdate) {
          await prisma.restaurant.update({
            where: { id: existing.id },
            data: {
              ...(photoReferences.length > 0 && (existing.photoReferences?.length ?? 0) === 0 ? { photoReferences } : {}),
              ...(openingHoursWeekdayText.length > 0 && (existing.openingHoursWeekdayText?.length ?? 0) === 0 ? { openingHoursWeekdayText } : {}),
            },
          });
        }
      } else {
        const created = await prisma.restaurant.create({
          data: {
            name: details.name || name,
            address: details.formattedAddress ?? address,
            formattedAddress: details.formattedAddress ?? address,
            latitude: details.latitude ?? null,
            longitude: details.longitude ?? null,
            googlePlaceId: details.placeId,
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
      if (address) {
        const geo = await geocodeAddress(address);
        if (geo) {
          latitude = geo.latitude;
          longitude = geo.longitude;
          formattedAddress = geo.formattedAddress;
        }
      }
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
        },
      });
      restaurantId = created.id;
    }

    await prisma['import'].create({
      data: {
        sourceUrl: sourceUrl || null,
        restaurantId,
      },
    });

    const restaurant = await prisma.restaurant.findUnique({
      where: { id: restaurantId },
      include: { visits: true },
    });

    return NextResponse.json(
      { data: restaurant },
      { status: 201 }
    );
  } catch (error) {
    console.error('Import error:', error);
    return NextResponse.json(
      { error: 'Failed to save import' },
      { status: 500 }
    );
  }
}
