import { Nav } from "@/components/shared/nav";
import { prisma } from "@/lib/prisma";
import { MapView } from "@/components/map/map-view";
import type { RestaurantStatus } from "@prisma/client";

export default async function MapPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; priceRange?: string }>;
}) {
  const params = await searchParams;
  const where: {
    isBlacklisted: boolean;
    status?: RestaurantStatus;
    priceRange?: string;
  } = {
    isBlacklisted: false,
  };
  if (params.status) where.status = params.status as RestaurantStatus;
  if (params.priceRange) where.priceRange = params.priceRange;

  const restaurants = await prisma.restaurant.findMany({
    where,
    include: {
      visits: { orderBy: { visitDate: "desc" }, take: 1 },
      photos: true,
      imports: true,
    },
  });

  return (
    <div className="fixed inset-0 min-h-screen bg-background overflow-hidden">
      <main className="relative h-full w-full">
        <MapView restaurants={restaurants} />
      </main>
      <Nav />
    </div>
  );
}
