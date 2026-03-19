import { redirect, notFound } from "next/navigation";
import { Nav } from "@/components/shared/nav";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { GroupDetailClient } from "@/components/groups/group-detail-client";
import type { GroupMember } from "@prisma/client";

export default async function GroupDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { id } = await params;

  const group = await prisma.group.findUnique({
    where: { id },
    include: {
      members: true,
      groupRestaurants: {
        include: { restaurant: true },
        orderBy: { addedAt: "desc" },
      },
    },
  });

  if (!group) notFound();

  const currentMember = group.members.find((m: GroupMember) => m.userId === user.id);
  if (!currentMember) redirect("/");

  const memberIds = group.members.map((m) => m.userId);
  const addedPairs = group.groupRestaurants.map((gr) => ({
    userId: gr.addedById,
    restaurantId: gr.restaurantId,
  }));

  const groupRestaurantIds = group.groupRestaurants.map((gr) => gr.restaurantId);

  // Fetch users, source URLs, and visited set (per-group) in parallel
  const [users, userRestaurants, visitedRestaurants] = await Promise.all([
    memberIds.length > 0
      ? prisma.user.findMany({
          where: { id: { in: memberIds } },
          select: { id: true, username: true, avatarUrl: true },
        })
      : Promise.resolve([]),
    addedPairs.length > 0
      ? prisma.userRestaurant.findMany({
          where: {
            OR: addedPairs.map((p) => ({
              userId: p.userId,
              restaurantId: p.restaurantId,
            })),
          },
          select: { userId: true, restaurantId: true, sourceUrl: true },
        })
      : Promise.resolve([]),
    groupRestaurantIds.length > 0
      ? prisma.visit.findMany({
          where: {
            userId: user.id,
            groupId: group.id,
            restaurantId: { in: groupRestaurantIds },
          },
          select: { restaurantId: true },
          distinct: ["restaurantId"],
        })
      : Promise.resolve([]),
  ]);

  const userMap = Object.fromEntries(users.map((u) => [u.id, u]));

  const membersWithUser = group.members.map((m) => ({
    id: m.id,
    userId: m.userId,
    role: m.role,
    user: userMap[m.userId]
      ? {
          username: userMap[m.userId].username,
          avatarUrl: userMap[m.userId].avatarUrl ?? undefined,
        }
      : null,
  }));

  const sourceUrlMap = new Map(
    userRestaurants.map((ur) => [
      `${ur.userId}:${ur.restaurantId}`,
      ur.sourceUrl ?? undefined,
    ]),
  );

  const visitedRestaurantIdSet = new Set(
    visitedRestaurants.map((v) => v.restaurantId),
  );

  const groupRestaurantsWithSource = group.groupRestaurants.map((gr) => ({
    id: gr.id,
    restaurantId: gr.restaurantId,
    restaurant: {
      id: gr.restaurant.id,
      name: gr.restaurant.name,
      formattedAddress: gr.restaurant.formattedAddress,
      cuisineTypes: gr.restaurant.cuisineTypes,
      priceRange: gr.restaurant.priceRange,
      ambianceTags: gr.restaurant.ambianceTags,
      visited: visitedRestaurantIdSet.has(gr.restaurantId),
    },
    sourceUrl: sourceUrlMap.get(`${gr.addedById}:${gr.restaurantId}`) ?? null,
  }));

  const groupData = {
    id: group.id,
    name: group.name,
    members: membersWithUser,
    groupRestaurants: groupRestaurantsWithSource,
    currentUserId: user.id,
    currentMember: { role: currentMember.role },
  };

  return (
    <div className="min-h-screen bg-background pb-32">
      <div className="h-32 w-full" />
      <GroupDetailClient group={groupData} />
      <Nav />
    </div>
  );
}
