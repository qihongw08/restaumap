import { redirect } from "next/navigation";
import Link from "next/link";
import { Nav } from "@/components/shared/nav";
import { RestaurantList } from "@/components/restaurants/restaurant-list";
import { DashboardHeader } from "@/components/home/dashboard-header";
import { getCurrentUser } from "@/lib/auth";
import { getDbUser } from "@/lib/sync-user";
import { ImportButtons } from "@/components/home/import-buttons";
import { prisma } from "@/lib/prisma";

export default async function Home() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [dbUser, userRestaurants] = await Promise.all([
    getDbUser(user.id),
    prisma.userRestaurant.findMany({
      where: { userId: user.id, isBlacklisted: false },
      orderBy: { savedAt: "desc" },
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
    }),
  ]);

  // Serialize Date objects before passing to the Client Component (rsc-boundaries rule)
  const initialRestaurants = userRestaurants.map((ur) => ({
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
        <div className="mb-10 space-y-6">
          <DashboardHeader user={dbUser} isLoggedIn />

          <ImportButtons />
        </div>

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-black italic tracking-tight text-foreground">
              Saved Restaurants
            </h2>
            <Link
              href="/restaurants"
              className="text-xs font-bold text-primary hover:underline uppercase tracking-widest"
            >
              View all
            </Link>
          </div>
          <RestaurantList initialRestaurants={initialRestaurants} />
        </section>
      </main>
      <Nav />
    </div>
  );
}
