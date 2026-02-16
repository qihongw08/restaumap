"use client";

import { useState } from "react";
import Link from "next/link";
import type { RestaurantWithDetails } from "@/types/restaurant";
import { ChevronRight, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import { PFRatioDisplay } from "@/components/visits/pf-ratio-display";
import { VisitForm } from "@/components/visits/visit-form";
import Image from "next/image";

interface RestaurantDetailProps {
  restaurant: RestaurantWithDetails;
}

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=800&h=600";

function getGoogleMapsUrl(restaurant: RestaurantWithDetails): string | null {
  const fallbackQuery =
    restaurant.formattedAddress || restaurant.address || restaurant.name || "";
  const queryParam = fallbackQuery
    ? `&query=${encodeURIComponent(fallbackQuery)}`
    : "";

  if (restaurant.googlePlaceId) {
    return `https://www.google.com/maps/search/?api=1${queryParam}&query_place_id=${encodeURIComponent(restaurant.googlePlaceId)}`;
  }
  if (restaurant.latitude != null && restaurant.longitude != null) {
    return `https://www.google.com/maps?q=${restaurant.latitude},${restaurant.longitude}`;
  }
  if (fallbackQuery) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fallbackQuery)}`;
  }
  return null;
}

export function RestaurantDetail({ restaurant }: RestaurantDetailProps) {
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);
  const googleMapsUrl = getGoogleMapsUrl(restaurant);

  const photoRefs = restaurant.photoReferences ?? [];
  const mainPhotoRef = photoRefs[selectedPhotoIndex] ?? null;
  const mainPhotoSrc = mainPhotoRef
    ? `/api/places/photo?reference=${encodeURIComponent(mainPhotoRef)}`
    : FALLBACK_IMAGE;

  return (
    <div className="relative min-h-screen bg-background pb-32">
      {/* Premium Image Header + optional gallery */}
      <div className="relative h-[45vh] w-full overflow-hidden">
        <Image
          src={mainPhotoSrc}
          alt={restaurant.name}
          width={800}
          height={450}
          unoptimized={mainPhotoSrc.startsWith("/api/places/photo")}
          className="h-full w-full object-cover"
        />
        {photoRefs.length > 1 && (
          <div className="absolute bottom-20 left-0 right-0 flex justify-center gap-2 px-4">
            {photoRefs.map((ref: string, i: number) => (
              <button
                key={ref}
                type="button"
                onClick={() => setSelectedPhotoIndex(i)}
                className={cn(
                  "h-12 w-12 shrink-0 overflow-hidden rounded-xl border-2 transition-all",
                  selectedPhotoIndex === i
                    ? "border-primary ring-2 ring-primary/50"
                    : "border-white/40 opacity-80 hover:opacity-100",
                )}
              >
                <Image
                  src={`/api/places/photo?reference=${encodeURIComponent(ref)}`}
                  alt=""
                  width={48}
                  height={48}
                  unoptimized
                  className="h-full w-full object-cover"
                />
              </button>
            ))}
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

        {/* Floating Actions */}
        <div className="absolute top-12 left-6 right-6 flex items-center justify-between">
          <Link href="/">
            <button className="flex h-10 w-10 items-center justify-center rounded-full bg-background/20 text-foreground backdrop-blur-md transition-colors hover:bg-background/40">
              <ChevronRight className="h-6 w-6 rotate-180" />
            </button>
          </Link>
          <div className="flex gap-2">
            {/* Functional actions could go here (e.g., Bookmark) */}
          </div>
        </div>

        {/* Floating Title Info */}
        <div className="absolute bottom-6 left-6 right-6 space-y-2">
          {(restaurant.sourceUrl ?? restaurant.savedAt) && (
            <div className="flex items-center gap-2">
              {restaurant.sourceUrl && (
                <a
                  href={restaurant.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-full bg-primary/20 backdrop-blur-md px-3 py-1 text-[10px] font-black tracking-widest text-primary border border-primary/30 hover:bg-primary/30"
                >
                  Imported from link
                </a>
              )}
              {restaurant.savedAt && (
                <span className="text-xs font-bold text-white/60">
                  Saved {new Date(restaurant.savedAt).toLocaleDateString()}
                </span>
              )}
            </div>
          )}
          <h1 className="text-3xl font-black italic tracking-tighter text-white">
            {restaurant.name}
          </h1>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="relative -mt-6 rounded-t-[2.5rem] bg-background p-6 shadow-2xl">
        {/* Navigation Tabs */}
        <div className="mb-8 flex items-center justify-start border-b-2 border-muted font-bold text-muted-foreground gap-8">
          {["Info", "Location"].map((tab, i) => (
            <button
              key={tab}
              className={cn(
                "pb-4 text-[10px] uppercase tracking-widest transition-all",
                i === 0
                  ? "text-primary border-b-2 border-primary"
                  : "hover:text-foreground opacity-60",
              )}
            >
              {tab}
            </button>
          ))}
        </div>

        {googleMapsUrl && (
          <a
            href={googleMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mb-6 flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-primary/30 bg-primary/10 py-3 px-4 text-sm font-black uppercase tracking-widest text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
          >
            <MapPin className="h-5 w-5 shrink-0" />
            Open in Google Maps
          </a>
        )}

        {/* Section: Main Course / Popular Dishes */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-black italic tracking-tighter text-foreground">
              Popular Dishes
            </h2>
          </div>

          <div className="space-y-4">
            {restaurant.popularDishes.map((dish) => (
              <div
                key={dish}
                className="group flex items-center gap-4 rounded-[2rem] border-2 border-muted bg-card p-4 shadow-sm transition-all hover:shadow-xl hover:border-primary/20"
              >
                <div className="flex-1">
                  <h3 className="text-md font-black italic tracking-tighter text-foreground uppercase">
                    {dish}
                  </h3>
                  <p className="mt-1 text-[10px] uppercase font-black tracking-widest text-muted-foreground">
                    Recommended Dish
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-12 space-y-6">
          <h2 className="text-xl font-black italic tracking-tighter text-foreground">
            Your Food Journey
          </h2>
          <PFRatioDisplay visits={restaurant.visits} />
          <div className="rounded-3l border-2 border-primary/20 p-6">
            <h3 className="mb-4 text-sm font-black italic text-foreground">
              LOG NEW VISIT
            </h3>
            <VisitForm restaurantId={restaurant.id} />
          </div>
        </div>
      </main>

      {/* Stick Nav Footer is managed by the page layout */}
    </div>
  );
}
