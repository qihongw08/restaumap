import { prisma } from "@/lib/prisma";
import { MapView } from "@/components/map/map-view";
import { ExpiredView } from "@/components/share/expired-view";
import { getSharedUserRestaurants, resolveShareLink } from "@/lib/share";

export default async function SharedUserMapPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ restaurant?: string }>;
}) {
  const { token } = await params;
  const query = await searchParams;
  const link = await resolveShareLink(token, "USER_MAP");
  if (!link || !link.targetUserId) return <ExpiredView />;

  const sharedUser = await prisma.user.findUnique({
    where: { id: link.targetUserId },
    select: { username: true },
  });
  const restaurants = await getSharedUserRestaurants(link.targetUserId);

  return (
    <div className="fixed inset-0 min-h-screen overflow-hidden bg-background">
      <main className="relative h-full w-full">
        <div className="pointer-events-none absolute left-1/2 top-8 z-[70] -translate-x-1/2">
          <div className="pointer-events-auto rounded-full border border-border/80 bg-background/90 px-4 py-2 text-xs font-black uppercase tracking-widest text-foreground shadow-lg backdrop-blur">
            Shared by @{sharedUser?.username ?? "user"}
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
