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

  // Check if there are any logs at all (to show/hide the "Logs" toggle)
  const hasLogs = await prisma.visit.findFirst({
    where: {
      ...(groupId ? { groupId } : { userId: user.id }),
    },
    select: { id: true },
  }).then(v => !!v);

  return (
    <div className="fixed inset-0 min-h-screen bg-background overflow-hidden">
      <main className="relative h-full w-full">
        <Suspense>
          <MapView
            highlightRestaurantId={params.restaurant ?? null}
            selectedGroupId={groupId}
            groupOptions={groupOptions}
            currentUserId={user.id}
            initialHasLogs={hasLogs}
          />
        </Suspense>
      </main>
      <Nav />
    </div>
  );
}
