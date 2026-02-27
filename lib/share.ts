import { randomBytes } from "node:crypto";
import type { ShareLink, ShareLinkType, RestaurantStatus } from "@prisma/client";
import type { RestaurantWithDetails } from "@/types/restaurant";
import { prisma } from "@/lib/prisma";

const SHARE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export function generateShareToken(): string {
  return randomBytes(24).toString("base64url");
}

export function getShareExpiryDate(): Date {
  return new Date(Date.now() + SHARE_TTL_MS);
}

export async function resolveShareLink(
  token: string,
  expectedType?: ShareLinkType,
): Promise<ShareLink | null> {
  const link = await prisma.shareLink.findUnique({ where: { token } });
  if (!link) return null;
  if (expectedType && link.type !== expectedType) return null;
  if (link.expiresAt <= new Date()) return null;
  return link;
}

function mapToSharedRestaurant(
  base: {
    id: string;
    name: string;
    address: string | null;
    formattedAddress: string | null;
    latitude: number | null;
    longitude: number | null;
    googlePlaceId: string | null;
    photoReferences: string[];
    openingHoursWeekdayText: string[];
    cuisineTypes: string[];
    popularDishes: string[];
    priceRange: string | null;
    ambianceTags: string[];
    createdAt: Date;
    updatedAt: Date;
  },
  status: RestaurantStatus = "WANT_TO_GO",
  sourceUrl: string | null = null,
): RestaurantWithDetails {
  return {
    ...base,
    visits: [],
    photos: [],
    status,
    sourceUrl,
  };
}

export async function getSharedUserRestaurants(
  userId: string,
): Promise<RestaurantWithDetails[]> {
  const userRestaurants = await prisma.userRestaurant.findMany({
    where: { userId, isBlacklisted: false },
    include: { restaurant: true },
    orderBy: { savedAt: "desc" },
  });

  return userRestaurants.map((ur) =>
    mapToSharedRestaurant(ur.restaurant, ur.status, ur.sourceUrl ?? null),
  );
}

export async function getSharedGroupRestaurants(
  groupId: string,
): Promise<RestaurantWithDetails[]> {
  const groupRestaurants = await prisma.groupRestaurant.findMany({
    where: { groupId },
    include: { restaurant: true },
    orderBy: { addedAt: "desc" },
  });

  const restaurantIds = groupRestaurants.map((gr) => gr.restaurantId);
  const userRestaurantSources = await prisma.userRestaurant.findMany({
    where: {
      restaurantId: { in: restaurantIds },
      sourceUrl: { not: null },
    },
    select: { restaurantId: true, sourceUrl: true, savedAt: true },
    orderBy: { savedAt: "desc" },
  });

  const sourceByRestaurantId = new Map<string, string>();
  for (const row of userRestaurantSources) {
    if (!sourceByRestaurantId.has(row.restaurantId) && row.sourceUrl) {
      sourceByRestaurantId.set(row.restaurantId, row.sourceUrl);
    }
  }

  return groupRestaurants.map((gr) =>
    mapToSharedRestaurant(
      gr.restaurant,
      "WANT_TO_GO",
      sourceByRestaurantId.get(gr.restaurantId) ?? null,
    ),
  );
}

export async function getSharedRestaurantForToken(
  token: string,
  restaurantId: string,
): Promise<RestaurantWithDetails | null> {
  const link = await resolveShareLink(token);
  if (!link) return null;

  if (link.type === "USER_MAP" && link.targetUserId) {
    const userRestaurant = await prisma.userRestaurant.findUnique({
      where: {
        userId_restaurantId: {
          userId: link.targetUserId,
          restaurantId,
        },
      },
      include: { restaurant: true },
    });
    if (!userRestaurant || userRestaurant.isBlacklisted) return null;
    return mapToSharedRestaurant(
      userRestaurant.restaurant,
      userRestaurant.status,
      userRestaurant.sourceUrl ?? null,
    );
  }

  if (link.type === "GROUP_MAP" && link.targetGroupId) {
    const inGroup = await prisma.groupRestaurant.findFirst({
      where: {
        groupId: link.targetGroupId,
        restaurantId,
      },
      include: { restaurant: true },
    });
    if (!inGroup) return null;

    const source = await prisma.userRestaurant.findFirst({
      where: { restaurantId, sourceUrl: { not: null } },
      select: { sourceUrl: true },
      orderBy: { savedAt: "desc" },
    });

    return mapToSharedRestaurant(
      inGroup.restaurant,
      "WANT_TO_GO",
      source?.sourceUrl ?? null,
    );
  }

  return null;
}
