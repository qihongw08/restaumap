import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { RestaurantDetail } from '@/components/restaurants/restaurant-detail';

export default async function RestaurantDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const restaurant = await prisma.restaurant.findUnique({
    where: { id },
    include: {
      visits: { orderBy: { visitDate: 'desc' } },
      photos: true,
      imports: { orderBy: { importedAt: 'desc' }, take: 5 },
    },
  });

  if (!restaurant) notFound();

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-lg">
        <RestaurantDetail restaurant={restaurant} />
      </main>
    </div>
  );
}
