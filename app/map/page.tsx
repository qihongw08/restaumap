import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Nav } from "@/components/shared/nav";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { MapView } from "@/components/map/map-view";
import type { MarkerData } from "@/types/restaurant";

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

  // Fetch group options and validate membership in parallel
  const [memberships, membership] = await Promise.all([
    prisma.groupMember.findMany({
      where: { userId: user.id },
      include: { group: { select: { id: true, name: true } } },
    }),
    groupId
      ? prisma.groupMember.findUnique({
          where: { groupId_userId: { groupId, userId: user.id } },
        })
      : Promise.resolve(true),
  ]);

  if (groupId && !membership) redirect("/");

  const groupOptions = memberships
    .map((m) => m.group)
    .sort((a, b) => a.name.localeCompare(b.name));

  // Lightweight markers + visit log markers — fetched in parallel
  const [userStatuses, groupRestaurants, personalRestaurants, visitLogs] =
    await Promise.all([
      // User's personal statuses (to show visited/favorite icons)
      prisma.userRestaurant.findMany({
        where: { userId: user.id },
        select: { restaurantId: true, status: true },
      }),
      // Group's shared restaurants (if in group view)
      groupId
        ? prisma.groupRestaurant.findMany({
            where: { groupId },
            include: {
              restaurant: {
                select: {
                  id: true,
                  name: true,
                  latitude: true,
                  longitude: true,
                },
              },
            },
          })
        : Promise.resolve([]),
      // Personal restaurants (if NOT in group view)
      !groupId
        ? prisma.userRestaurant.findMany({
            where: { userId: user.id, isBlacklisted: false },
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
          })
        : Promise.resolve([]),
      // Collective or personal visits
      prisma.visit.findMany({
        where: {
          ...(groupId ? { groupId } : { userId: user.id }),
          restaurant: { latitude: { not: null }, longitude: { not: null } },
        },
        select: {
          id: true,
          restaurantId: true,
          visitDate: true,
          photos: { select: { url: true }, take: 1 },
          restaurant: {
            select: { id: true, name: true, latitude: true, longitude: true },
          },
        },
        orderBy: { visitDate: "desc" },
      }),
    ]);

  const statusMap = Object.fromEntries(
    userStatuses.map((s) => [s.restaurantId, s.status]),
  );

  const markers: MarkerData[] = groupId
    ? groupRestaurants.map((gr) => ({
        id: gr.restaurant.id,
        name: gr.restaurant.name,
        latitude: gr.restaurant.latitude,
        longitude: gr.restaurant.longitude,
        status: statusMap[gr.restaurant.id] ?? "WANT_TO_GO",
      }))
    : personalRestaurants.map((ur) => ({
        id: ur.restaurant.id,
        name: ur.restaurant.name,
        latitude: ur.restaurant.latitude,
        longitude: ur.restaurant.longitude,
        status: ur.status,
      }));

  const serializedVisitLogs = visitLogs.map((v) => ({
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

  return (
    <div className="fixed inset-0 min-h-screen bg-background overflow-hidden">
      <main className="relative h-full w-full">
        <Suspense>
          <MapView
            markers={markers}
            visitLogMarkers={serializedVisitLogs}
            highlightRestaurantId={params.restaurant ?? null}
            selectedGroupId={groupId}
            groupOptions={groupOptions}
            currentUserId={user.id}
          />
        </Suspense>
      </main>
      <Nav />
    </div>
  );
}
