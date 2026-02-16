"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { RESTAURANT_STATUS_LABELS } from "@/lib/constants";
import type { RestaurantWithVisits } from "@/types/restaurant";
import { formatPFRatio } from "@/lib/utils";
import { MapPin, ChevronRight, ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import Image from "next/image";

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=400&h=250";

interface RestaurantCardProps {
  restaurant: RestaurantWithVisits;
  onRemove?: (id: string, name: string) => void;
}

export function RestaurantCard({ restaurant, onRemove }: RestaurantCardProps) {
  const latestVisit = restaurant.visits[0];
  const statusLabel =
    RESTAURANT_STATUS_LABELS[restaurant.status] ?? restaurant.status;

  const r = restaurant as Record<string, unknown>;
  const photoRefs = Array.isArray(r.photoReferences)
    ? (r.photoReferences as string[])
    : [];
  const slides =
    photoRefs.length > 0
      ? photoRefs.map(
          (ref) => `/api/places/photo?reference=${encodeURIComponent(ref)}`,
        )
      : [FALLBACK_IMAGE];

  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (slides.length <= 1) return;
    const t = setInterval(() => {
      setCurrentIndex((i) => (i + 1) % slides.length);
    }, 4000);
    return () => clearInterval(t);
  }, [slides.length]);

  const go = (delta: number) => (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentIndex((i) => (i + delta + slides.length) % slides.length);
  };

  return (
    <Card className="group relative overflow-hidden transition-all duration-300 hover:shadow-[0_12px_40px_rgba(0,0,0,0.1)] hover:-translate-y-1 bg-card border-border border-2 rounded-[2.5rem]">
      <Link href={`/restaurants/${restaurant.id}`} className="block">
        <div className="relative aspect-[16/10] w-full overflow-hidden">
          {slides.map((src, i) => (
            <Image
              key={src}
              src={src}
              alt={restaurant.name}
              width={400}
              height={250}
              unoptimized={src.startsWith("/api/places/photo")}
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
              style={{
                transform: `translateX(${(i - currentIndex) * 100}%)`,
                zIndex: i === currentIndex ? 1 : 0,
              }}
            />
          ))}
          {slides.length > 1 && (
            <>
              <button
                type="button"
                onClick={go(-1)}
                className="absolute left-2 top-1/2 z-10 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-black/40 text-white hover:bg-black/60 transition-colors"
                aria-label="Previous photo"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={go(1)}
                className="absolute right-2 top-1/2 z-10 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-black/40 text-white hover:bg-black/60 transition-colors"
                aria-label="Next photo"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
              <div className="absolute bottom-2 left-0 right-0 z-10 flex justify-center gap-1.5">
                {slides.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setCurrentIndex(i);
                    }}
                    className={cn(
                      "h-1.5 rounded-full transition-all",
                      i === currentIndex
                        ? "w-4 bg-white"
                        : "w-1.5 bg-white/50 hover:bg-white/70",
                    )}
                    aria-label={`Go to photo ${i + 1}`}
                  />
                ))}
              </div>
            </>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
        </div>

        <CardContent className="p-6">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="text-xl font-black italic tracking-tighter text-foreground leading-tight uppercase">
                {restaurant.name}
              </h3>
              <p className="mt-1 text-sm font-bold text-muted-foreground uppercase tracking-widest leading-none">
                {restaurant.cuisineTypes.join(" • ")}
              </p>
            </div>
            <span className="shrink-0 text-md font-black italic text-primary">
              {restaurant.priceRange}
            </span>
          </div>

          <div className="mt-6 space-y-4">
            {restaurant.formattedAddress && (
              <p className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
                <MapPin className="h-3.5 w-3.5 shrink-0 text-primary" />
                <span className="truncate">{restaurant.formattedAddress}</span>
              </p>
            )}

            <div className="flex items-center justify-between pt-2">
              <div className="flex gap-2">
                <span className="rounded-full bg-primary/10 px-4 py-1.5 text-[10px] font-black uppercase tracking-widest text-primary border border-primary/20">
                  {statusLabel}
                </span>
                {latestVisit && (
                  <span className="rounded-full bg-secondary/10 px-4 py-1.5 text-[10px] font-black uppercase tracking-widest text-secondary border border-secondary/20">
                    PF {formatPFRatio(latestVisit.pfRatio)}
                  </span>
                )}
              </div>
              <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center transition-all group-hover:bg-primary group-hover:text-primary-foreground shadow-sm">
                <ChevronRight className="h-4 w-4" />
              </div>
            </div>
          </div>
        </CardContent>
      </Link>

      {onRemove && (
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onRemove(restaurant.id, restaurant.name);
          }}
          className="absolute top-4 left-4 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-background/90 text-destructive backdrop-blur-sm hover:bg-destructive hover:text-white border border-destructive/20 transition-colors"
          title="Remove from list"
        >
          <span className="text-xl leading-none">×</span>
        </button>
      )}
    </Card>
  );
}
