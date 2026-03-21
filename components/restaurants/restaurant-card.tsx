"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { RESTAURANT_STATUS_LABELS } from "@/lib/constants";
import type { RestaurantWithVisits } from "@/types/restaurant";
import { formatPFRatio, calculatePFRatio } from "@/lib/utils";
import { MapPin, ChevronRight, Sparkles, ExternalLink, User as UserIcon } from "lucide-react";
import Image from "next/image";

interface RestaurantCardProps {
  restaurant: RestaurantWithVisits;
  onRemove?: (id: string, name: string) => void;
}

export function RestaurantCard({ restaurant, onRemove }: RestaurantCardProps) {
  const latestVisit = restaurant.visits[0];
  const statusLabel =
    RESTAURANT_STATUS_LABELS[restaurant.status] ?? restaurant.status;

  const r = restaurant as Record<string, unknown>;
  const ambianceTags = Array.isArray(r.ambianceTags)
    ? (r.ambianceTags as string[])
    : [];
  const sourceUrl = typeof r.sourceUrl === "string" ? r.sourceUrl : null;

  return (
    <Card className="group relative overflow-hidden transition-all duration-300 hover:shadow-[0_12px_40px_rgba(0,0,0,0.1)] hover:-translate-y-1 bg-card border-border border-2 rounded-[2.5rem]">
      <Link href={`/restaurants/${restaurant.id}`} className="block">
        <CardContent className="px-6 pb-6 pt-12">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <h3 className="text-xl font-black italic tracking-tighter text-foreground leading-tight uppercase">
                {restaurant.name}
              </h3>
              <p className="mt-1 text-sm font-bold text-muted-foreground uppercase tracking-widest leading-none">
                {restaurant.cuisineTypes.join(" • ")}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              {restaurant.addedBy && (
                <div className="shrink-0">
                  {restaurant.addedBy.avatarUrl ? (
                    <Image
                      src={restaurant.addedBy.avatarUrl}
                      alt={restaurant.addedBy.username ?? "User"}
                      width={32}
                      height={32}
                      className="h-8 w-8 rounded-full border-2 border-primary/20 object-cover shadow-sm"
                    />
                  ) : (
                    <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-primary/20 bg-muted text-[10px] font-black text-muted-foreground uppercase shadow-sm">
                      {(restaurant.addedBy.username ?? "?")[0]}
                    </div>
                  )}
                </div>
              )}
              <span className="text-md font-black italic text-primary">
                {restaurant.priceRange}
              </span>
            </div>
          </div>

          <div className="mt-5 space-y-3">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 text-xs">
              {restaurant.formattedAddress && (
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <MapPin className="h-3 w-3 shrink-0 text-primary" />
                  <span className="truncate">
                    {restaurant.formattedAddress}
                  </span>
                </span>
              )}
              {ambianceTags.length > 0 && (
                <>
                  {restaurant.formattedAddress && (
                    <span className="text-muted-foreground/60">·</span>
                  )}
                  <span className="inline-flex items-center gap-1 rounded-md bg-muted/80 px-2 py-0.5 text-muted-foreground">
                    <Sparkles className="h-3 w-3" />
                    {ambianceTags.slice(0, 3).join(" · ")}
                  </span>
                </>
              )}
              {sourceUrl && (
                <>
                  {(restaurant.formattedAddress || ambianceTags.length > 0) && (
                    <span className="text-muted-foreground/60">·</span>
                  )}
                  <button
                    type="button"
                    role="link"
                    className="inline-flex items-center gap-1 truncate font-medium text-primary hover:underline text-left"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      window.open(sourceUrl, "_blank", "noopener,noreferrer");
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        e.stopPropagation();
                        window.open(sourceUrl, "_blank", "noopener,noreferrer");
                      }
                    }}
                  >
                    <ExternalLink className="h-3 w-3 shrink-0" />
                    {(() => {
                      try {
                        return new URL(sourceUrl).hostname.replace(
                          /^www\./,
                          "",
                        );
                      } catch {
                        return "Source";
                      }
                    })()}
                  </button>
                </>
              )}
            </div>

            <div className="flex items-center justify-between pt-1">
              <div className="flex gap-2">
                <span className="rounded-full bg-primary/10 px-4 py-1.5 text-[10px] font-black uppercase tracking-widest text-primary border border-primary/20">
                  {statusLabel}
                </span>
                {latestVisit && (
                  <span className="rounded-full bg-secondary/10 px-4 py-1.5 text-[10px] font-black uppercase tracking-widest text-secondary border border-secondary/20">
                    PF{" "}
                    {formatPFRatio(
                      calculatePFRatio(
                        latestVisit.fullnessScore,
                        latestVisit.tasteScore,
                        latestVisit.pricePaid,
                      ),
                    )}
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
          className="absolute top-3 left-3 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-background/90 text-destructive backdrop-blur-sm hover:bg-destructive hover:text-white border border-destructive/20 transition-colors"
          title="Remove from list"
        >
          <span className="text-xl leading-none">×</span>
        </button>
      )}
    </Card>
  );
}
