import { redirect } from "next/navigation";
import { Nav } from "@/components/shared/nav";
import { RestaurantList } from "@/components/restaurants/restaurant-list";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ShareLinkButton } from "@/components/share/share-link-button";
import { BackLink } from "@/components/shared/back-link";

const PAGE_SIZE = 10;

export default async function CollectionPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const userRestaurants = await prisma.userRestaurant.findMany({
    where: { userId: user.id, isBlacklisted: false },
    orderBy: { savedAt: "desc" },
    take: PAGE_SIZE + 1,
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

  const hasMore = userRestaurants.length > PAGE_SIZE;
  const pageItems = hasMore
    ? userRestaurants.slice(0, PAGE_SIZE)
    : userRestaurants;
  const initialCursor = hasMore
    ? pageItems[pageItems.length - 1].id
    : null;

  const initialRestaurants = pageItems.map((ur) => ({
    ...ur.restaurant,
    createdAt: ur.restaurant.createdAt.toISOString(),
    updatedAt: ur.restaurant.updatedAt.toISOString(),
    status: ur.status,
    isBlacklisted: ur.isBlacklisted,
    sourceUrl: ur.sourceUrl,
    visits: ur.restaurant.visits.map((v) => ({
      ...v,
      visitDate: v.visitDate.toISOString(),
      createdAt: v.createdAt.toISOString(),
      updatedAt: v.updatedAt.toISOString(),
      photos: v.photos.map((p) => ({
        ...p,
        uploadedAt: p.uploadedAt.toISOString(),
      })),
    })),
  }));

  return (
    <div className="min-h-screen bg-background pb-32">
      <div className="h-32 w-full" />
      <main className="mx-auto max-w-lg px-6">
        <div className="mb-6">
          <BackLink>Home</BackLink>
        </div>
        <div className="mb-6 flex items-center justify-between gap-4">
          <h1 className="text-2xl font-black italic tracking-tighter text-foreground uppercase">
            My Collection
          </h1>
          <ShareLinkButton
            endpoint="/api/share/user"
            label="Share"
            className="shrink-0 rounded-xl border border-black/15 bg-white px-4 py-2 text-xs shadow-sm"
          />
        </div>
        <RestaurantList
          initialRestaurants={initialRestaurants}
          initialCursor={initialCursor}
        />
      </main>
      <Nav />
    </div>
  );
}
