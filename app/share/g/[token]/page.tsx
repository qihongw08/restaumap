import { prisma } from "@/lib/prisma";
import { MapView } from "@/components/map/map-view";
import { ExpiredView } from "@/components/share/expired-view";
import { getSharedGroupRestaurants, resolveShareLink } from "@/lib/share";

export default async function SharedGroupMapPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ restaurant?: string }>;
}) {
  const { token } = await params;
  const query = await searchParams;
  const link = await resolveShareLink(token, "GROUP_MAP");
  if (!link || !link.targetGroupId) return <ExpiredView />;

  const group = await prisma.group.findUnique({
    where: { id: link.targetGroupId },
    select: { name: true },
  });
  if (!group) return <ExpiredView />;

  const restaurants = await getSharedGroupRestaurants(link.targetGroupId);

  return (
    <div className="fixed inset-0 min-h-screen overflow-hidden bg-background">
      <main className="relative h-full w-full">
        <div className="pointer-events-none absolute left-1/2 top-8 z-[70] -translate-x-1/2">
          <div className="pointer-events-auto rounded-full border border-border/80 bg-background/90 px-4 py-2 text-xs font-black uppercase tracking-widest text-foreground shadow-lg backdrop-blur">
            Shared group: {group.name}
          </div>
        </div>
        <MapView
          restaurants={restaurants}
          highlightRestaurantId={query.restaurant ?? null}
          shareToken={token}
          showPhotos={false}
        />
      </main>
    </div>
  );
}
