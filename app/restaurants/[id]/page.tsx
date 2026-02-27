import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { RestaurantDetail } from "@/components/restaurants/restaurant-detail";
import { PublicRestaurantDetail } from "@/components/restaurants/public-restaurant-detail";
import { getSharedRestaurantForToken, resolveShareLink } from "@/lib/share";
import type { RestaurantStatus } from "@prisma/client";

export default async function RestaurantDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ shareToken?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const shareToken =
    typeof query.shareToken === "string" && query.shareToken.trim()
      ? query.shareToken.trim()
      : null;
  const user = await getCurrentUser();
  if (!user) {
    if (!shareToken) redirect("/login");
    const [sharedRestaurant, link] = await Promise.all([
      getSharedRestaurantForToken(shareToken, id),
      resolveShareLink(shareToken),
    ]);
    if (!sharedRestaurant || !link) notFound();
    const mapHref =
      link.type === "GROUP_MAP"
        ? `/share/g/${shareToken}?restaurant=${id}`
        : `/share/u/${shareToken}?restaurant=${id}`;
    return (
      <div className="min-h-screen bg-background">
        <main className="mx-auto max-w-lg">
          <PublicRestaurantDetail restaurant={sharedRestaurant} mapHref={mapHref} />
        </main>
      </div>
    );
  }

  const userRestaurant = await prisma.userRestaurant.findUnique({
    where: { userId_restaurantId: { userId: user.id, restaurantId: id } },
    include: {
      restaurant: {
        include: {
          visits: {
            where: { userId: user.id },
            orderBy: { visitDate: "desc" },
            include: { photos: true },
          },
          photos: { where: { userId: user.id } },
        },
      },
    },
  });

  if (userRestaurant) {
    const restaurant = {
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
    return (
      <div className="min-h-screen bg-background">
        <main className="mx-auto max-w-lg">
          <RestaurantDetail restaurant={restaurant} />
        </main>
      </div>
    );
  }

  const inGroup = await prisma.groupRestaurant.findFirst({
    where: {
      restaurantId: id,
      group: { members: { some: { userId: user.id } } },
    },
  });
  if (!inGroup) notFound();

  const adderLink = await prisma.userRestaurant.findUnique({
    where: {
      userId_restaurantId: {
        userId: inGroup.addedById,
        restaurantId: id,
      },
    },
    select: { sourceUrl: true, sourcePlatform: true, rawCaption: true },
  });

  const restaurantRow = await prisma.restaurant.findUnique({
    where: { id },
    include: {
      visits: {
        where: { userId: user.id },
        orderBy: { visitDate: "desc" },
        include: { photos: true },
      },
      photos: { where: { userId: user.id } },
    },
  });
  if (!restaurantRow) notFound();

  const restaurant = {
    ...restaurantRow,
    status: "WANT_TO_GO" as RestaurantStatus,
    isBlacklisted: false,
    sourceUrl: adderLink?.sourceUrl ?? null,
    sourcePlatform: adderLink?.sourcePlatform ?? null,
    rawCaption: adderLink?.rawCaption ?? null,
    savedAt: undefined,
  };

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-lg">
        <RestaurantDetail restaurant={restaurant} />
      </main>
    </div>
  );
}
