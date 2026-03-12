import { redirect } from "next/navigation";
import { Nav } from "@/components/shared/nav";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getDbUser } from "@/lib/sync-user";
import { ProfileHeader } from "@/components/profile/profile-header";
import { ProfileClient } from "@/components/profile/profile-client";
import { calculatePFRatio } from "@/lib/utils";

const PAGE_SIZE = 10;

export default async function ProfilePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const dbUser = await getDbUser(user.id);
  if (!dbUser?.username) redirect("/profile/set-username");

  // Aggregate stats + first page of visits — fetched in parallel
  const [visitCount, uniqueRestaurantIds, allScores, firstPageVisits] = await Promise.all([
    prisma.visit.count({ where: { userId: user.id } }),
    prisma.visit.findMany({
      where: { userId: user.id },
      distinct: ["restaurantId"],
      select: { restaurantId: true },
    }),
    prisma.visit.findMany({
      where: { userId: user.id },
      select: { fullnessScore: true, tasteScore: true, pricePaid: true },
    }),
    prisma.visit.findMany({
      where: { userId: user.id },
      orderBy: { visitDate: "desc" },
      take: PAGE_SIZE + 1,
      include: {
        restaurant: { select: { id: true, name: true } },
        photos: { select: { id: true, url: true } },
        group: { select: { id: true, name: true } },
      },
    }),
  ]);

  const uniqueRestaurants = uniqueRestaurantIds.length;
  const pfScores = allScores.map((v) =>
    calculatePFRatio(Number(v.fullnessScore), Number(v.tasteScore), Number(v.pricePaid)),
  );
  const bestPF = pfScores.length > 0 ? Math.max(...pfScores) : 0;

  const hasMore = firstPageVisits.length > PAGE_SIZE;
  const pageItems = hasMore ? firstPageVisits.slice(0, PAGE_SIZE) : firstPageVisits;
  const initialCursor = hasMore ? pageItems[pageItems.length - 1].id : null;

  const serializedVisits = pageItems.map((v) => ({
    id: v.id,
    userId: v.userId,
    restaurantId: v.restaurantId,
    visitDate: v.visitDate.toISOString(),
    fullnessScore: Number(v.fullnessScore),
    tasteScore: Number(v.tasteScore),
    pricePaid: Number(v.pricePaid),
    notes: v.notes,
    photos: v.photos,
    restaurant: v.restaurant,
    group: v.group ? { id: v.group.id, name: v.group.name } : null,
  }));

  return (
    <div className="min-h-screen bg-background pb-32">
      <div className="h-32 w-full" />
      <main className="mx-auto max-w-lg px-6">
        <ProfileHeader
          username={dbUser.username}
          avatarUrl={dbUser.avatarUrl ?? undefined}
          totalVisits={visitCount}
          uniqueRestaurants={uniqueRestaurants}
          bestPF={bestPF}
        />
        <ProfileClient visits={serializedVisits} initialCursor={initialCursor} />
      </main>
      <Nav />
    </div>
  );
}
