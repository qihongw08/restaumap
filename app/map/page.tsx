import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Nav } from "@/components/shared/nav";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { MapView } from "@/components/map/map-view";
import type { RestaurantStatus } from "@prisma/client";
import type { RestaurantWithDetails } from "@/types/restaurant";

export default async function MapPage({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string;
    priceRange?: string;
    restaurant?: string;
    groupId?: string;
  }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const params = await searchParams;
  const groupId =
    typeof params.groupId === "string" && params.groupId.trim()
      ? params.groupId.trim()
      : null;

  const memberships = await prisma.groupMember.findMany({
    where: { userId: user.id },
    include: { group: { select: { id: true, name: true } } },
  });
  const groupOptions = memberships
    .map((m) => m.group)
    .sort((a, b) => a.name.localeCompare(b.name));

  if (groupId) {
    const membership = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId: user.id } },
      include: { group: { select: { id: true, name: true } } },
    });
    if (!membership) redirect("/groups");
  }

  const userRestaurants = await prisma.userRestaurant.findMany({
    where: {
      userId: user.id,
      isBlacklisted: false,
      ...(params.status ? { status: params.status as RestaurantStatus } : {}),
      ...(groupId
        ? {
            restaurant: {
              groupRestaurants: {
                some: { groupId },
              },
            },
          }
        : {}),
    },
    include: {
      restaurant: {
        include: {
          visits: {
            where: { userId: user.id },
            orderBy: { visitDate: "desc" },
            take: 1,
            include: { photos: true },
          },
          photos: { where: { userId: user.id } },
        },
      },
    },
  });

  let list = userRestaurants.map((ur) => ({
    ...ur.restaurant,
    createdAt: ur.restaurant.createdAt.toISOString(),
    updatedAt: ur.restaurant.updatedAt.toISOString(),
    status: ur.status,
    isBlacklisted: ur.isBlacklisted,
    visits: ur.restaurant.visits.map((v) => ({
      ...v,
      visitDate: v.visitDate.toISOString(),
      createdAt: v.createdAt.toISOString(),
      updatedAt: v.updatedAt.toISOString(),
    })),
    photos: ur.restaurant.photos.map((p) => ({
      ...p,
      uploadedAt: p.uploadedAt.toISOString(),
    })),
  }));
  if (params.priceRange) {
    list = list.filter((r) => r.priceRange === params.priceRange);
  }
  const restaurants = list as unknown as RestaurantWithDetails[];

  return (
    <div className="fixed inset-0 min-h-screen bg-background overflow-hidden">
      <main className="relative h-full w-full">
        <Suspense>
          <MapView
            restaurants={restaurants}
            highlightRestaurantId={params.restaurant ?? null}
            selectedGroupId={groupId}
            groupOptions={groupOptions}
          />
        </Suspense>
      </main>
      <Nav />
    </div>
  );
}
