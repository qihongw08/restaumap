import { redirect } from "next/navigation";
import { Nav } from "@/components/shared/nav";
import { DashboardHeader } from "@/components/home/dashboard-header";
import { ImportButtons } from "@/components/home/import-buttons";
import { GroupCards } from "@/components/home/group-cards";
import { RecentActivity } from "@/components/home/recent-activity";
import { getCurrentUser } from "@/lib/auth";
import { getDbUser } from "@/lib/sync-user";
import { prisma } from "@/lib/prisma";

export default async function Home() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [dbUser, userGroups, recentVisits, recentRestaurants] = await Promise.all([
    getDbUser(user.id),
    prisma.groupMember.findMany({
      where: { userId: user.id },
      orderBy: { sortOrder: "asc" },
      include: {
        group: {
          include: {
            _count: { select: { members: true, groupRestaurants: true } },
            members: { take: 4 },
          },
        },
      },
    }),
    prisma.visit.findMany({
      where: { userId: user.id },
      orderBy: { visitDate: "desc" },
      take: 5,
      include: {
        restaurant: { select: { id: true, name: true } },
        photos: { select: { url: true }, take: 1 },
        group: { select: { id: true, name: true } },
      },
    }),
    prisma.userRestaurant.findMany({
      where: { userId: user.id, isBlacklisted: false },
      orderBy: { savedAt: "desc" },
      take: 3,
      include: {
        restaurant: {
          select: { id: true, name: true, formattedAddress: true },
        },
      },
    }),
  ]);

  const groups = userGroups.map((g) => g.group);

  // Fetch member avatars for group cards
  const allMemberIds = [
    ...new Set(groups.flatMap((g) => g.members.map((m) => m.userId))),
  ];
  const memberUsers =
    allMemberIds.length > 0
      ? await prisma.user.findMany({
          where: { id: { in: allMemberIds } },
          select: { id: true, username: true, avatarUrl: true },
        })
      : [];
  const userMap = Object.fromEntries(memberUsers.map((u) => [u.id, u]));

  const groupCards = groups.map((g) => ({
    id: g.id,
    name: g.name,
    memberCount: g._count.members,
    restaurantCount: g._count.groupRestaurants,
    memberAvatars: g.members.map((m) => {
      const u = userMap[m.userId];
      return {
        id: m.id,
        avatarUrl: u?.avatarUrl ?? undefined,
        username: u?.username ?? undefined,
      };
    }),
  }));

  const visitItems = recentVisits.map((v) => ({
    id: v.id,
    restaurantId: v.restaurantId,
    restaurantName: v.restaurant.name,
    visitDate: v.visitDate.toISOString(),
    fullnessScore: Number(v.fullnessScore),
    tasteScore: Number(v.tasteScore),
    pricePaid: Number(v.pricePaid),
    photoUrl: v.photos[0]?.url,
    groupName: v.group?.name ?? undefined,
  }));

  const addedItems = recentRestaurants.map((ur) => ({
    restaurantId: ur.restaurant.id,
    restaurantName: ur.restaurant.name,
    address: ur.restaurant.formattedAddress ?? undefined,
    savedAt: ur.savedAt.toISOString(),
  }));

  return (
    <div className="min-h-screen bg-background pb-32">
      <div className="h-32 w-full" />
      <main className="mx-auto max-w-lg px-6 space-y-8">
        <DashboardHeader user={dbUser} isLoggedIn />
        <ImportButtons />
        <GroupCards groups={groupCards} />
        <RecentActivity visits={visitItems} added={addedItems} />
      </main>
      <Nav />
    </div>
  );
}
