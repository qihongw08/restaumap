"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import {
  Pizza,
  Search,
  ChevronUp,
  ChevronDown,
  Clock,
  DollarSign,
  UtensilsCrossed,
  Soup,
  Beef,
  Flame,
  Coffee,
  IceCream,
} from "lucide-react";
import type { RestaurantWithDetails } from "@/types/restaurant";
import { useLocation } from "@/hooks/use-location";
import Image from "next/image";

interface NearbyBottomSheetProps {
  restaurants: RestaurantWithDetails[];
  highlightedRestaurantId?: string | null;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** First click: select and zoom to restaurant. Second click (same card): navigate to restaurant page. */
  onRestaurantClick?: (restaurantId: string) => void;
}

const CATEGORIES = [
  { name: "All", icon: UtensilsCrossed },
  { name: "Pizza", icon: Pizza },
  { name: "Chinese", icon: Soup },
  { name: "Steak", icon: Beef },
  { name: "Thai", icon: Flame },
  { name: "Burgers", icon: UtensilsCrossed },
  { name: "Cafe", icon: Coffee },
  { name: "Dessert", icon: IceCream },
];

const PRICE_RANGES = ["$", "$$", "$$$", "$$$$"] as const;
const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=400&h=250";

// Google weekday_text is Monday=0 .. Sunday=6; JS getDay() is Sunday=0 .. Saturday=6
function getTodaysHours(weekdayText: string[] | undefined): string | null {
  if (!weekdayText?.length) return null;
  const jsDay = new Date().getDay();
  const index = (jsDay + 6) % 7;
  return weekdayText[index] ?? null;
}

function getOpenUntil(weekdayText: string[] | undefined): string | null {
  const line = getTodaysHours(weekdayText);
  if (!line) return null;
  const afterColon = line.includes(":")
    ? line.slice(line.indexOf(":") + 1).trim()
    : line;
  if (!afterColon || /closed/i.test(afterColon)) return "Closed";
  const ranges = afterColon.split(/[,，]/).map((r) => r.trim());
  const lastRange = ranges[ranges.length - 1];
  const dash = lastRange.match(/\s+[–-]\s+/);
  if (!dash) return null;
  const closing = lastRange
    .slice((dash.index ?? 0) + (dash[0]?.length ?? 0))
    .trim();
  if (!closing) return null;
  return `Open until ${closing}`;
}

function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
) {
  const R = 3958.8; // Earth's radius in miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function NearbyBottomSheet({
  restaurants,
  highlightedRestaurantId = null,
  isOpen: controlledOpen,
  onOpenChange,
  onRestaurantClick,
}: NearbyBottomSheetProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled =
    controlledOpen !== undefined && onOpenChange !== undefined;
  const isOpen = isControlled ? controlledOpen : internalOpen;
  const setIsOpen = isControlled ? onOpenChange : setInternalOpen;
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [activeCategory, setActiveCategory] = useState("All");
  const [priceRangeFilter, setPriceRangeFilter] = useState<string | null>(null);
  const [onlyOpen, setOnlyOpen] = useState(false);
  const [openStatusByPlaceId, setOpenStatusByPlaceId] = useState<
    Record<string, boolean>
  >({});
  const [loadingOpenStatus, setLoadingOpenStatus] = useState(false);

  const { coords, getLocation } = useLocation();

  useEffect(() => {
    getLocation();
  }, [getLocation]);

  const toggleSheet = () => setIsOpen(!isOpen);

  useEffect(() => {
    if (!highlightedRestaurantId || !isOpen) return;
    const el = cardRefs.current[highlightedRestaurantId];
    if (!el) return;
    const t = setTimeout(() => {
      el.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }, 400);
    return () => clearTimeout(t);
  }, [highlightedRestaurantId, isOpen]);

  const baseFiltered = useMemo(() => {
    let result = [...restaurants];

    if (activeCategory !== "All") {
      result = result.filter((r) =>
        r.cuisineTypes?.some((c) =>
          c.toLowerCase().includes(activeCategory.toLowerCase()),
        ),
      );
    }

    if (priceRangeFilter != null) {
      result = result.filter((r) => r.priceRange === priceRangeFilter);
    }

    const withDetails = result.map((res) => {
      let distance: number | null = null;
      if (coords && res.latitude != null && res.longitude != null) {
        distance = calculateDistance(
          coords.latitude,
          coords.longitude,
          res.latitude,
          res.longitude,
        );
      }
      return { ...res, distance };
    });

    withDetails.sort(
      (a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity),
    );

    return withDetails;
  }, [restaurants, activeCategory, priceRangeFilter, coords]);

  const placeIdsToFetch = useMemo(
    () => baseFiltered.map((r) => r.googlePlaceId).filter(Boolean) as string[],
    [baseFiltered],
  );
  const placeIdsKey = placeIdsToFetch.join(",");

  useEffect(() => {
    if (!onlyOpen || placeIdsToFetch.length === 0) {
      const t = setTimeout(() => setLoadingOpenStatus(false), 0);
      return () => clearTimeout(t);
    }
    let cancelled = false;
    const loadingTimer = setTimeout(() => {
      if (!cancelled) setLoadingOpenStatus(true);
    }, 0);
    fetch(`/api/places/opening-status?placeIds=${placeIdsKey}`)
      .then((res) => res.json())
      .then((json: { data: Record<string, { openNow: boolean }> }) => {
        if (cancelled) return;
        const next: Record<string, boolean> = {};
        for (const [placeId, val] of Object.entries(json.data ?? {})) {
          next[placeId] = val.openNow;
        }
        setOpenStatusByPlaceId(next);
      })
      .finally(() => {
        if (!cancelled) setLoadingOpenStatus(false);
      });
    return () => {
      cancelled = true;
      clearTimeout(loadingTimer);
    };
  }, [onlyOpen, placeIdsKey, placeIdsToFetch.length]);

  const filteredRestaurants = useMemo(() => {
    if (!onlyOpen) return baseFiltered;
    if (loadingOpenStatus) return [];
    return baseFiltered.filter(
      (r) => r.googlePlaceId && openStatusByPlaceId[r.googlePlaceId!],
    );
  }, [baseFiltered, onlyOpen, loadingOpenStatus, openStatusByPlaceId]);

  return (
    <div
      className={cn(
        "fixed bottom-0 left-0 right-0 z-[60] transition-all duration-500 ease-in-out",
        isOpen ? "h-[85vh]" : "h-32",
      )}
    >
      <div className="relative h-full w-full bg-card/95 backdrop-blur-2xl border-t-4 border-primary/30 rounded-t-[3.5rem] shadow-[0_-30px_60px_rgba(0,0,0,0.7)] flex flex-col overflow-hidden">
        <div
          className="w-full flex flex-col items-center pt-4 pb-2 cursor-pointer select-none"
          onClick={toggleSheet}
        >
          <div className="w-14 h-1.5 bg-primary/20 rounded-full mb-2" />
          <div className="flex items-center gap-2 text-primary font-black italic tracking-tighter uppercase text-[9px]">
            {isOpen ? (
              <ChevronDown className="h-3 w-3 animate-bounce" />
            ) : (
              <ChevronUp className="h-3 w-3 animate-bounce" />
            )}
            {isOpen ? "Minimize" : "Explore Nearby"}
          </div>
        </div>

        <div className="px-6 pb-6">
          <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide snap-x">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.name}
                onClick={() => setActiveCategory(cat.name)}
                className={cn(
                  "flex flex-col items-center gap-3 min-w-[4.5rem] transition-all snap-start",
                  activeCategory === cat.name
                    ? "opacity-100 scale-105"
                    : "opacity-30 hover:opacity-100",
                )}
              >
                <div
                  className={cn(
                    "h-16 w-16 rounded-[1.5rem] flex items-center justify-center border-2 transition-all shadow-xl",
                    activeCategory === cat.name
                      ? "bg-primary border-primary text-primary-foreground shadow-primary/40 rotate-3"
                      : "bg-background border-border text-foreground -rotate-2",
                  )}
                >
                  <cat.icon className="h-7 w-7" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-[0.2em]">
                  {cat.name}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="px-6 mb-6 flex flex-wrap gap-2">
          <button
            onClick={() => setOnlyOpen(!onlyOpen)}
            className={cn(
              "flex items-center gap-2 px-5 py-2.5 rounded-full border text-[10px] font-black uppercase tracking-widest transition-all shadow-sm",
              onlyOpen
                ? "bg-primary border-primary text-primary-foreground"
                : "bg-muted border-border text-muted-foreground",
            )}
          >
            <Clock className="h-3 w-3" /> Open Now
          </button>
          <div className="flex items-center gap-1.5">
            <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
            {PRICE_RANGES.map((pr) => (
              <button
                key={pr}
                onClick={() =>
                  setPriceRangeFilter(priceRangeFilter === pr ? null : pr)
                }
                className={cn(
                  "px-3 py-2 rounded-full border text-[10px] font-black uppercase tracking-widest transition-all shadow-sm",
                  priceRangeFilter === pr
                    ? "bg-primary/20 border-primary/30 text-primary"
                    : "bg-muted border-border text-muted-foreground hover:border-primary/30",
                )}
              >
                {pr}
              </button>
            ))}
            {priceRangeFilter != null && (
              <button
                onClick={() => setPriceRangeFilter(null)}
                className="px-3 py-2 rounded-full border border-border text-[10px] font-bold text-muted-foreground hover:bg-muted"
              >
                Clear
              </button>
            )}
          </div>
        </div>
        <div className="flex-1 min-w-0 overflow-y-auto px-6 pb-20 custom-scrollbar">
          <div className="min-w-0 space-y-5">
            <div className="sticky top-0 z-10 -mx-6 flex items-center justify-between border-b border-border/50 bg-card/95 px-6 py-2 backdrop-blur-sm">
              <h3 className="text-xs font-black italic tracking-tighter text-muted-foreground/60 uppercase">
                {filteredRestaurants.length} Restaurants Found
              </h3>
            </div>

            {filteredRestaurants.map((res) => (
              <div
                key={res.id}
                ref={(el) => {
                  cardRefs.current[res.id] = el;
                }}
              >
                <button
                  type="button"
                  onClick={() => onRestaurantClick?.(res.id)}
                  className={cn(
                    "group relative flex w-full min-w-0 flex-col gap-4 p-5 rounded-[2.5rem] bg-background/40 border transition-all active:scale-[0.98] shadow-sm text-left overflow-hidden",
                    highlightedRestaurantId === res.id
                      ? "border-primary ring-2 ring-primary/50 bg-primary/5"
                      : "border-primary/5 hover:border-primary/40 hover:bg-muted/80",
                  )}
                >
                  <div className="flex min-w-0 items-center gap-5">
                    <div className="h-24 w-24 rounded-3xl bg-muted overflow-hidden flex-shrink-0 border-2 border-primary/10 group-hover:border-primary shadow-lg ring-4 ring-primary/5">
                      <Image
                        src={
                          res.photoReferences?.[0]
                            ? `/api/places/photo?reference=${encodeURIComponent(res.photoReferences[0])}`
                            : FALLBACK_IMAGE
                        }
                        alt={res.name}
                        width={96}
                        height={96}
                        unoptimized={!!res.photoReferences?.[0]}
                        className="h-full w-full object-cover group-hover:scale-110 transition-transform duration-700"
                      />
                    </div>

                    <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="text-md font-black italic tracking-tighter text-foreground uppercase truncate group-hover:text-primary transition-colors">
                          {res.name}
                        </h4>
                        {res.distance != null && (
                          <div className="flex min-w-0 max-w-[40%] items-center gap-1 overflow-hidden bg-primary/10 px-3 py-1 rounded-full border border-primary/20">
                            <span className="truncate text-[10px] font-black text-primary uppercase">
                              {res.distance.toFixed(1)} MI
                            </span>
                          </div>
                        )}
                      </div>
                      {(res.formattedAddress ?? res.address) && (
                        <p className="text-[10px] text-muted-foreground truncate">
                          {res.formattedAddress ?? res.address}
                        </p>
                      )}
                      <div className="flex items-center gap-2">
                        <UtensilsCrossed className="h-3 w-3 shrink-0 text-muted-foreground" />
                        <p className="text-[10px] font-black uppercase text-muted-foreground truncate">
                          {res.cuisineTypes?.[0] || "Gourmet"} •{" "}
                          {res.priceRange || "—"}
                        </p>
                      </div>
                      {getOpenUntil(res.openingHoursWeekdayText) && (
                        <div className="flex items-center gap-2 text-muted-foreground mt-1">
                          <Clock className="h-3 w-3 shrink-0" />
                          <span className="text-[10px] font-black uppercase truncate">
                            {getOpenUntil(res.openingHoursWeekdayText)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {res.ambianceTags && res.ambianceTags.length > 0 && (
                    <div className="flex gap-2 overflow-x-auto scrollbar-hide">
                      {res.ambianceTags.slice(0, 3).map((tag) => (
                        <span
                          key={tag}
                          className="px-3 py-1 rounded-full bg-muted/60 border border-border/50 text-[8px] font-black uppercase tracking-widest text-muted-foreground truncate"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </button>
              </div>
            ))}

            {onlyOpen && loadingOpenStatus && (
              <div className="flex flex-col items-center justify-center py-20 gap-4">
                <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                  Checking opening hours…
                </p>
              </div>
            )}
            {filteredRestaurants.length === 0 &&
              !(onlyOpen && loadingOpenStatus) && (
                <div className="flex flex-col items-center justify-center py-20 opacity-30 gap-4">
                  <Search className="h-12 w-12 text-primary" />
                  <p className="text-xs font-black uppercase tracking-widest">
                    {onlyOpen
                      ? "No open places right now"
                      : "No matching places"}
                  </p>
                </div>
              )}
          </div>
        </div>
      </div>
    </div>
  );
}
