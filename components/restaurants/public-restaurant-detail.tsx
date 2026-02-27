"use client";

import Link from "next/link";
import { ChevronRight, Clock, DollarSign, MapPin } from "lucide-react";
import type { RestaurantWithDetails } from "@/types/restaurant";

type PublicRestaurantDetailProps = {
  restaurant: RestaurantWithDetails;
  mapHref: string;
};

export function PublicRestaurantDetail({
  restaurant,
  mapHref,
}: PublicRestaurantDetailProps) {
  return (
    <div className="relative min-h-screen bg-background pb-16">
      <div className="h-32 w-full px-6 pt-12">
        <div className="flex items-center justify-between">
          <Link href={mapHref}>
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-foreground transition-colors hover:bg-muted/70">
              <ChevronRight className="h-6 w-6 rotate-180" />
            </div>
          </Link>
        </div>
      </div>

      <main className="relative bg-background p-6">
        <h1 className="mb-4 text-3xl font-black italic tracking-tighter text-foreground">
          {restaurant.name}
        </h1>

        {restaurant.sourceUrl && (
          <a
            href={restaurant.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mb-6 inline-flex rounded-full bg-primary/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-primary"
          >
            Imported from link
          </a>
        )}

        <div className="mb-6 space-y-4 rounded-2xl border-2 border-muted bg-card/50 p-4">
          {(restaurant.formattedAddress ?? restaurant.address) && (
            <div className="flex gap-3">
              <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <p className="text-sm font-medium text-foreground">
                {restaurant.formattedAddress ?? restaurant.address}
              </p>
            </div>
          )}
          {restaurant.priceRange && (
            <div className="flex gap-3">
              <DollarSign className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <p className="text-sm font-bold text-foreground">
                {restaurant.priceRange}
              </p>
            </div>
          )}
          {(restaurant.openingHoursWeekdayText?.length ?? 0) > 0 && (
            <div className="flex gap-3">
              <Clock className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <div className="space-y-1 text-sm text-foreground">
                {restaurant.openingHoursWeekdayText?.map((line) => (
                  <p key={line} className="font-medium">
                    {line}
                  </p>
                ))}
              </div>
            </div>
          )}
        </div>

        {restaurant.popularDishes.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-xl font-black italic tracking-tighter text-foreground">
              Popular Dishes
            </h2>
            <ul className="space-y-2">
              {restaurant.popularDishes.map((dish) => (
                <li
                  key={dish}
                  className="rounded-2xl border border-border bg-card px-4 py-3 text-sm font-bold text-foreground"
                >
                  {dish}
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
    </div>
  );
}
