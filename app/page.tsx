import { Nav } from "@/components/shared/nav";
import { RestaurantList } from "@/components/restaurants/restaurant-list";
import { DashboardHeader } from "@/components/home/dashboard-header";
import Link from "next/link";
import { Plus, Download } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-background pb-32">
      <div className="h-32 w-full" /> {/* Spacer for fixed header */}
      <main className="mx-auto max-w-lg px-6">
        {/* Dashboard Header */}
        <div className="mb-10 space-y-6">
          <DashboardHeader />

          {/* Quick Actions */}
          <div className="flex gap-3">
            <Link
              href="/restaurants/new"
              className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3 text-xs font-black uppercase tracking-widest text-primary-foreground shadow-lg transition-transform active:scale-95"
            >
              <Plus className="h-4 w-4" /> Add New
            </Link>
            <Link
              href="/import"
              className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-muted px-4 py-3 text-xs font-black uppercase tracking-widest text-foreground shadow-sm transition-transform active:scale-95"
            >
              <Download className="h-4 w-4" /> Import
            </Link>
          </div>
        </div>

        {/* List Section */}
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
          <RestaurantList />
        </section>
      </main>
      <Nav />
    </div>
  );
}
