"use server";

import { z } from "zod";
import { authActionClient, authMutationClient } from "@/lib/safe-action";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import type { RestaurantStatus } from "@prisma/client";

const createRestaurantSchema = z.object({
  name: z.string().min(1, "Name is required"),
  address: z.string().nullable().optional(),
  formattedAddress: z.string().nullable().optional(),
  latitude: z.number().nullable().optional(),
  longitude: z.number().nullable().optional(),
  googlePlaceId: z.string().nullable().optional(),
  openingHoursWeekdayText: z.array(z.string()).optional(),
  cuisineTypes: z.array(z.string()).optional(),
  popularDishes: z.array(z.string()).optional(),
  priceRange: z.string().nullable().optional(),
  ambianceTags: z.array(z.string()).optional(),
  status: z.enum(["WANT_TO_GO", "VISITED"]).optional().default("WANT_TO_GO"),
  sourceUrl: z.string().nullable().optional(),
  sourcePlatform: z.string().nullable().optional(),
  rawCaption: z.string().nullable().optional(),
});

export const createRestaurantAction = authMutationClient
  .inputSchema(createRestaurantSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { status, ...body } = parsedInput;

    const restaurantData = {
      name: body.name,
      address: body.address ?? null,
      formattedAddress: body.formattedAddress ?? null,
      latitude: body.latitude ?? null,
      longitude: body.longitude ?? null,
      googlePlaceId: body.googlePlaceId ?? null,
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
          ...(restaurantData.cuisineTypes.length > 0 ? { cuisineTypes: restaurantData.cuisineTypes } : {}),
          ...(restaurantData.popularDishes.length > 0 ? { popularDishes: restaurantData.popularDishes } : {}),
          ...(body.priceRange ? { priceRange: body.priceRange } : {}),
          ...(restaurantData.ambianceTags.length > 0 ? { ambianceTags: restaurantData.ambianceTags } : {}),
          ...(body.openingHoursWeekdayText && body.openingHoursWeekdayText.length > 0
            ? { openingHoursWeekdayText: body.openingHoursWeekdayText }
            : {}),
        },
      });
    } else {
      restaurant = await prisma.restaurant.create({ data: restaurantData });
    }

    const userRestaurant = await prisma.userRestaurant.upsert({
      where: {
        userId_restaurantId: { userId: ctx.user.id, restaurantId: restaurant.id },
      },
      create: {
        userId: ctx.user.id,
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

    const result = {
      ...withVisits!,
      status: userRestaurant.status,
      isBlacklisted: false,
      blacklistReason: null,
      blacklistedAt: null,
      sourceUrl: userRestaurant.sourceUrl,
      sourcePlatform: userRestaurant.sourcePlatform,
      rawCaption: userRestaurant.rawCaption,
    };

    revalidatePath(`/restaurants/${restaurant.id}`);
    return result;
  });

const importRestaurantSchema = z.object({
  sourceUrl: z.string().nullable().optional(),
  sourcePlatform: z.string().nullable().optional(),
  name: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  formattedAddress: z.string().optional().nullable(),
  latitude: z.number().optional().nullable(),
  longitude: z.number().optional().nullable(),
  placeId: z.string().optional().nullable(),
  extracted: z.object({
    name: z.string().optional().nullable(),
    address: z.string().optional().nullable(),
    formattedAddress: z.string().optional().nullable(),
    cuisineTypes: z.array(z.string()).optional(),
    popularDishes: z.array(z.string()).optional(),
    priceRange: z.string().optional().nullable(),
    ambianceTags: z.array(z.string()).optional(),
    openingHoursWeekdayText: z.array(z.string()).optional(),
    rawCaption: z.string().optional().nullable(),
  }).optional().default({}),
});

export const importRestaurantAction = authMutationClient
  .inputSchema(importRestaurantSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { sourceUrl, sourcePlatform, placeId, extracted } = parsedInput;

    const name = (parsedInput.name?.trim() || null) ?? extracted.name ?? "Unknown";
    const address = (parsedInput.address?.trim() || null) ?? extracted.address ?? null;
    const rawCaption = extracted.rawCaption ?? null;
    const cuisineTypes = extracted.cuisineTypes ?? [];
    const popularDishes = extracted.popularDishes ?? [];
    const priceRange = extracted.priceRange ?? null;
    const ambianceTags = extracted.ambianceTags ?? [];

    const rawFormatted = parsedInput.formattedAddress ?? extracted.formattedAddress ?? address;
    const formattedAddress = rawFormatted ?? null;
    const latitude = parsedInput.latitude ?? null;
    const longitude = parsedInput.longitude ?? null;
    const googlePlaceId = placeId?.trim() || null;
    const openingHoursWeekdayText = extracted.openingHoursWeekdayText ?? [];

    let restaurantId: string;

    if (googlePlaceId) {
      const existing = await prisma.restaurant.findUnique({
        where: { googlePlaceId },
      });

      if (existing) {
        restaurantId = existing.id;

        const needsCoords =
          latitude != null && longitude != null && (existing.latitude == null || existing.longitude == null);

        const needsOpeningHours =
          openingHoursWeekdayText.length > 0 && (existing.openingHoursWeekdayText?.length ?? 0) === 0;

        const needsName = !!name && name !== existing.name;
        const needsAddress = address != null && address !== existing.address;
        const needsFormattedAddress =
          formattedAddress != null && formattedAddress !== existing.formattedAddress;

        const needsUpdate = needsOpeningHours || needsCoords || needsName || needsAddress || needsFormattedAddress;

        if (needsUpdate) {
          await prisma.restaurant.update({
            where: { id: existing.id },
            data: {
              ...(needsOpeningHours ? { openingHoursWeekdayText } : {}),
              ...(needsCoords && latitude != null && longitude != null ? { latitude, longitude } : {}),
              ...(needsName ? { name } : {}),
              ...(needsAddress ? { address } : {}),
              ...(needsFormattedAddress ? { formattedAddress } : {}),
            },
          });
        }
      } else {
        const created = await prisma.restaurant.create({
          data: {
            name, address, formattedAddress, latitude, longitude,
            googlePlaceId, openingHoursWeekdayText, cuisineTypes,
            popularDishes, priceRange, ambianceTags,
          },
        });
        restaurantId = created.id;
      }
    } else {
      const created = await prisma.restaurant.create({
        data: {
          name, address, formattedAddress, latitude, longitude,
          cuisineTypes, popularDishes, priceRange, ambianceTags, openingHoursWeekdayText,
        },
      });
      restaurantId = created.id;
    }

    await prisma.userRestaurant.upsert({
      where: { userId_restaurantId: { userId: ctx.user.id, restaurantId } },
      create: {
        userId: ctx.user.id, restaurantId, status: "WANT_TO_GO",
        sourceUrl: sourceUrl || null, sourcePlatform, rawCaption,
      },
      update: {
        sourceUrl: sourceUrl ?? null, sourcePlatform, rawCaption,
      },
    });

    await prisma["import"].create({
      data: { sourceUrl: sourceUrl || null, restaurantId, userId: ctx.user.id },
    });

    return { id: restaurantId };
  });

const getRestaurantsSchema = z.object({
  status: z.enum(["WANT_TO_GO", "VISITED"]).optional().nullable(),
  excludeBlacklisted: z.boolean().optional().default(true),
  limit: z.number().min(1).max(50).optional().default(10),
  cursor: z.string().optional().nullable(),
  cuisine: z.string().optional().nullable(),
  priceRange: z.string().optional().nullable(),
  groupId: z.string().optional().nullable(),
  minLat: z.number().optional().nullable(),
  maxLat: z.number().optional().nullable(),
  minLng: z.number().optional().nullable(),
  maxLng: z.number().optional().nullable(),
});

export const getRestaurantsAction = authActionClient
  .inputSchema(getRestaurantsSchema)
  .action(async ({ parsedInput, ctx }) => {
    const {
      status, excludeBlacklisted, limit, cursor, cuisine, priceRange,
      groupId, minLat, maxLat, minLng, maxLng
    } = parsedInput;

    const hasBounds = minLat != null && maxLat != null && minLng != null && maxLng != null;

    let cuisineRestaurantIds: string[] | undefined;
    if (cuisine) {
      // @ts-ignore dynamic schema string isn't correctly typed
      const matches = await prisma.$queryRawUnsafe<{ id: string }[]>(
        `SELECT r.id FROM "public".restaurants r WHERE EXISTS (SELECT 1 FROM unnest(r.cuisine_types) AS ct WHERE ct ILIKE $1)`,
        `%${cuisine}%`
      );
      cuisineRestaurantIds = matches.map((m) => m.id);
      if (cuisineRestaurantIds.length === 0) {
        return { data: [], nextCursor: null };
      }
    }

    const where = {
      userId: ctx.user.id,
      ...(status ? { status } : {}),
      ...(excludeBlacklisted ? { isBlacklisted: false } : {}),
      ...(cuisineRestaurantIds || priceRange || groupId || hasBounds
        ? {
            restaurant: {
              ...(cuisineRestaurantIds ? { id: { in: cuisineRestaurantIds } } : {}),
              ...(priceRange ? { priceRange } : {}),
              ...(groupId ? { groupRestaurants: { some: { groupId } } } : {}),
              ...(hasBounds ? {
                latitude: { gte: minLat, lte: maxLat },
                longitude: { gte: minLng, lte: maxLng },
              } : {}),
            },
          }
        : {}),
    } as any;

    const include = {
      restaurant: {
        include: {
          visits: {
            where: { userId: ctx.user.id },
            orderBy: { visitDate: "desc" },
            take: 5,
            include: { photos: true },
          },
        },
      },
    } as any;

    const userRestaurants = await prisma.userRestaurant.findMany({
      where,
      include,
      orderBy: { savedAt: "desc" },
      ...(hasBounds ? {} : {
        take: limit + 1,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      }),
    });

    userRestaurants.sort((a, b) => {
      const aVisited = a.status === "VISITED" ? 1 : 0;
      const bVisited = b.status === "VISITED" ? 1 : 0;
      return aVisited - bVisited;
    });

    const hasMore = !hasBounds && userRestaurants.length > limit;
    const items = hasBounds || !hasMore ? userRestaurants : userRestaurants.slice(0, limit);

    const data = items.map((ur: any) => ({
      ...ur.restaurant,
      status: ur.status,
      isBlacklisted: ur.isBlacklisted,
      blacklistReason: ur.blacklistReason,
      blacklistedAt: ur.blacklistedAt,
      sourceUrl: ur.sourceUrl,
      sourcePlatform: ur.sourcePlatform,
      rawCaption: ur.rawCaption,
    }));

    const nextCursor = hasBounds || !hasMore ? null : items[items.length - 1].id;
    return { data, nextCursor };
  });

const restaurantIdSchema = z.object({ id: z.string() });

export const getRestaurantAction = authActionClient
  .inputSchema(restaurantIdSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { id } = parsedInput;

    const userRestaurant = await prisma.userRestaurant.findUnique({
      where: { userId_restaurantId: { userId: ctx.user.id, restaurantId: id } },
      include: {
        restaurant: {
          include: {
            visits: {
              where: { userId: ctx.user.id },
              orderBy: { visitDate: 'desc' },
              include: { photos: true },
            },
            photos: { where: { userId: ctx.user.id } },
          },
        },
      },
    });

    if (userRestaurant) {
      return {
        ...userRestaurant.restaurant,
        status: userRestaurant.status,
        isBlacklisted: userRestaurant.isBlacklisted,
        blacklistReason: userRestaurant.blacklistReason,
        blacklistedAt: userRestaurant.blacklistedAt,
        sourceUrl: userRestaurant.sourceUrl,
        sourcePlatform: userRestaurant.sourcePlatform,
        rawCaption: userRestaurant.rawCaption,
        savedAt: userRestaurant.savedAt,
      };
    }

    const inGroup = await prisma.groupRestaurant.findFirst({
      where: {
        restaurantId: id,
        group: { members: { some: { userId: ctx.user.id } } },
      },
    });

    if (!inGroup) throw new Error('Restaurant not found');

    const adderLink = await prisma.userRestaurant.findUnique({
      where: {
        userId_restaurantId: { userId: inGroup.addedById, restaurantId: id },
      },
      select: { sourceUrl: true, sourcePlatform: true, rawCaption: true },
    });

    const restaurant = await prisma.restaurant.findUnique({
      where: { id },
      include: {
        visits: {
          where: { userId: ctx.user.id },
          orderBy: { visitDate: 'desc' },
          include: { photos: true },
        },
        photos: { where: { userId: ctx.user.id } },
      },
    });

    if (!restaurant) throw new Error('Restaurant not found');

    return {
      ...restaurant,
      status: 'WANT_TO_GO',
      isBlacklisted: false,
      blacklistReason: null,
      blacklistedAt: null,
      sourceUrl: adderLink?.sourceUrl ?? null,
      sourcePlatform: adderLink?.sourcePlatform ?? null,
      rawCaption: adderLink?.rawCaption ?? null,
      savedAt: null,
    };
  });

const updateRestaurantSchema = z.object({
  id: z.string(),
  name: z.string().optional(),
  address: z.string().optional(),
  formattedAddress: z.string().optional(),
  latitude: z.number().optional().nullable(),
  longitude: z.number().optional().nullable(),
  cuisineTypes: z.array(z.string()).optional(),
  popularDishes: z.array(z.string()).optional(),
  priceRange: z.string().optional().nullable(),
  ambianceTags: z.array(z.string()).optional(),
  status: z.enum(["WANT_TO_GO", "VISITED"]).optional(),
  sourceUrl: z.string().optional().nullable(),
  sourcePlatform: z.string().optional().nullable(),
  rawCaption: z.string().optional().nullable(),
});

export const updateRestaurantAction = authMutationClient
  .inputSchema(updateRestaurantSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { id, status, sourceUrl, sourcePlatform, rawCaption, ...restaurantData } = parsedInput;

    const link = await prisma.userRestaurant.findUnique({
      where: { userId_restaurantId: { userId: ctx.user.id, restaurantId: id } },
    });
    if (!link) throw new Error('Restaurant not found');

    const [restaurant, userRestaurant] = await prisma.$transaction([
      prisma.restaurant.update({
        where: { id },
        data: restaurantData,
      }),
      prisma.userRestaurant.update({
        where: { userId_restaurantId: { userId: ctx.user.id, restaurantId: id } },
        data: {
          ...(status !== undefined ? { status } : {}),
          ...(sourceUrl !== undefined ? { sourceUrl } : {}),
          ...(sourcePlatform !== undefined ? { sourcePlatform } : {}),
          ...(rawCaption !== undefined ? { rawCaption } : {}),
        },
      }),
    ]);

    const result = {
      ...restaurant,
      status: userRestaurant.status,
      isBlacklisted: userRestaurant.isBlacklisted,
      blacklistReason: userRestaurant.blacklistReason,
      blacklistedAt: userRestaurant.blacklistedAt,
      sourceUrl: userRestaurant.sourceUrl,
      sourcePlatform: userRestaurant.sourcePlatform,
      rawCaption: userRestaurant.rawCaption,
    };

    revalidatePath(`/restaurants/${id}`);
    return result;
  });

export const deleteRestaurantAction = authMutationClient
  .inputSchema(restaurantIdSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { id } = parsedInput;
    const link = await prisma.userRestaurant.findUnique({
      where: { userId_restaurantId: { userId: ctx.user.id, restaurantId: id } },
    });
    if (!link) throw new Error('Restaurant not found');
    
    await prisma.userRestaurant.delete({
      where: { userId_restaurantId: { userId: ctx.user.id, restaurantId: id } },
    });
    
    return { id };
  });

export const getRestaurantMarkersAction = authActionClient
  .inputSchema(z.object({ groupId: z.string().optional().nullable() }))
  .action(async ({ parsedInput, ctx }) => {
    const { groupId } = parsedInput;

    const userRestaurants = await prisma.userRestaurant.findMany({
      where: {
        userId: ctx.user.id,
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

    return userRestaurants.map((ur) => ({
      id: ur.restaurant.id,
      name: ur.restaurant.name,
      latitude: ur.restaurant.latitude,
      longitude: ur.restaurant.longitude,
      status: ur.status,
    }));
  });

const CUISINE_KEYWORDS = [
  "Mexican", "Japanese", "Chinese", "Korean", "Thai", "Vietnamese", "Indian", "Italian", "French", "Mediterranean", "Greek", "Turkish", "Middle Eastern", "American", "Southern", "Cajun", "Hawaiian", "Caribbean", "Brazilian", "Peruvian", "Ethiopian", "Moroccan", "Spanish", "Filipino", "Malaysian", "Indonesian", "Taiwanese", "Pizza", "Sushi", "Ramen", "Pho", "Tacos", "BBQ", "Burger", "Steak", "Seafood", "Vegan", "Vegetarian", "Brunch", "Bakery", "Dessert", "Cafe", "Coffee", "Tea", "Bar", "Pub", "Dim Sum", "Hot Pot", "Noodle", "Curry", "Tapas", "Deli", "Soul Food", "Fusion",
];

function normalizeCuisine(raw: string): string {
  const lower = raw.toLowerCase();
  for (const keyword of CUISINE_KEYWORDS) {
    if (lower.includes(keyword.toLowerCase())) return keyword;
  }
  return raw.trim();
}

export const getCuisinesAction = authActionClient.action(async ({ ctx }) => {
  const restaurants = await prisma.userRestaurant.findMany({
    where: { userId: ctx.user.id, isBlacklisted: false },
    select: { restaurant: { select: { cuisineTypes: true } } },
  });

  const cuisineSet = new Set<string>();
  for (const ur of restaurants) {
    for (const c of ur.restaurant.cuisineTypes) {
      cuisineSet.add(normalizeCuisine(c));
    }
  }
  return [...cuisineSet].sort();
});

const blacklistSchema = z.object({
  id: z.string(),
  reason: z.string().optional().nullable(),
});

export const blacklistRestaurantAction = authMutationClient
  .inputSchema(blacklistSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { id, reason } = parsedInput;
    const link = await prisma.userRestaurant.findUnique({
      where: { userId_restaurantId: { userId: ctx.user.id, restaurantId: id } },
    });
    if (!link) throw new Error("Restaurant not found");

    const userRestaurant = await prisma.userRestaurant.update({
      where: { userId_restaurantId: { userId: ctx.user.id, restaurantId: id } },
      data: {
        isBlacklisted: true,
        blacklistReason: reason ?? null,
        blacklistedAt: new Date(),
      },
    });

    const restaurant = await prisma.restaurant.findUnique({ where: { id } });
    return {
      ...restaurant!,
      status: userRestaurant.status,
      isBlacklisted: userRestaurant.isBlacklisted,
      blacklistReason: userRestaurant.blacklistReason,
      blacklistedAt: userRestaurant.blacklistedAt,
    };
  });

export const unblacklistRestaurantAction = authMutationClient
  .inputSchema(z.object({ id: z.string() }))
  .action(async ({ parsedInput, ctx }) => {
    const { id } = parsedInput;
    const link = await prisma.userRestaurant.findUnique({
      where: { userId_restaurantId: { userId: ctx.user.id, restaurantId: id } },
    });
    if (!link) throw new Error("Restaurant not found");

    const userRestaurant = await prisma.userRestaurant.update({
      where: { userId_restaurantId: { userId: ctx.user.id, restaurantId: id } },
      data: {
        isBlacklisted: false,
        blacklistReason: null,
        blacklistedAt: null,
      },
    });

    const restaurant = await prisma.restaurant.findUnique({ where: { id } });
    return {
      ...restaurant!,
      status: userRestaurant.status,
      isBlacklisted: userRestaurant.isBlacklisted,
      blacklistReason: userRestaurant.blacklistReason,
      blacklistedAt: userRestaurant.blacklistedAt,
    };
  });
