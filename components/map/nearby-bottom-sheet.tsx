import { useState, useMemo, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import {
  Search,
  ChevronUp,
  ChevronDown,
  Clock,
  DollarSign,
  UtensilsCrossed,
  ExternalLink,
  GripHorizontal,
} from "lucide-react";
import type { RestaurantWithDetails } from "@/types/restaurant";
import { useLocation } from "@/hooks/use-location";
import { motion, useAnimation, PanInfo } from "framer-motion";
import Image from "next/image";

interface NearbyBottomSheetProps {
  restaurants: RestaurantWithDetails[];
  highlightedRestaurantId?: string | null;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  onRestaurantClick?: (restaurantId: string) => void;
  showPhotos?: boolean;
  controlledCategory?: string;
  onCategoryChange?: (category: string) => void;
  controlledPriceRange?: string | null;
  onPriceRangeChange?: (priceRange: string | null) => void;
  cuisines?: string[];
}

const PRICE_RANGES = ["$", "$$", "$$$", "$$$$"] as const;

// ... (getTodaysHours, getOpenUntil, calculateDistance remain same)

export function NearbyBottomSheet({
  restaurants,
  highlightedRestaurantId = null,
  isOpen: controlledOpen,
  onOpenChange,
  onRestaurantClick,
  controlledCategory,
  onCategoryChange,
  controlledPriceRange,
  onPriceRangeChange,
  cuisines,
}: NearbyBottomSheetProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined && onOpenChange !== undefined;
  const isOpen = isControlled ? controlledOpen : internalOpen;
  const setIsOpen = isControlled ? onOpenChange : setInternalOpen;
  
  const controls = useAnimation();
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Filters state
  const [internalCategory, setInternalCategory] = useState("All");
  const activeCategory = controlledCategory ?? internalCategory;
  const setActiveCategory = onCategoryChange ?? setInternalCategory;
  const [internalPriceRange, setInternalPriceRange] = useState<string | null>(null);
  const priceRangeFilter = controlledPriceRange !== undefined ? controlledPriceRange : internalPriceRange;
  const setPriceRangeFilter = onPriceRangeChange ?? setInternalPriceRange;
  const [onlyOpen, setOnlyOpen] = useState(false);

  const { coords, getLocation } = useLocation();

  useEffect(() => {
    getLocation();
  }, [getLocation]);

  // Snap points defined by y offset from bottom (0 = fully expanded at 85vh)
  const [snaps, setSnaps] = useState({ full: 0, mid: 400, min: 600 });
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const h = window.innerHeight;
    setSnaps({
      full: 0,
      mid: h * 0.4,
      min: h * 0.85 - 128,
    });
  }, []);

  useEffect(() => {
    if (!isMounted) return;
    if (isOpen) {
      controls.start({ y: snaps.full });
    } else {
      controls.start({ y: snaps.min });
    }
  }, [isOpen, controls, snaps, isMounted]);

  const handleDragEnd = (_: any, info: PanInfo) => {
    const currentY = info.point.y - (window.innerHeight - window.innerHeight * 0.85); // Approximate
    const y = info.offset.y + (isOpen ? snaps.full : snaps.min);

    // Snap to closest
    const points = [snaps.full, snaps.mid, snaps.min];
    const closest = points.reduce((prev, curr) => 
      Math.abs(curr - y) < Math.abs(prev - y) ? curr : prev
    );

    if (closest === snaps.full) {
      setIsOpen(true);
      controls.start({ y: snaps.full });
    } else if (closest === snaps.mid) {
      setIsOpen(true);
      controls.start({ y: snaps.mid });
    } else {
      setIsOpen(false);
      controls.start({ y: snaps.min });
    }
  };

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

    withDetails.sort((a, b) => {
      const aVisited = a.status === "VISITED" ? 1 : 0;
      const bVisited = b.status === "VISITED" ? 1 : 0;
      if (aVisited !== bVisited) return aVisited - bVisited;
      return (a.distance ?? Infinity) - (b.distance ?? Infinity);
    });

    return withDetails;
  }, [restaurants, activeCategory, priceRangeFilter, coords]);

  const filteredRestaurants = useMemo(() => {
    if (!onlyOpen) return baseFiltered;
    return baseFiltered.filter((r) => {
      const status = getOpenUntil(r.openingHoursWeekdayText);
      return status && status !== "Closed";
    });
  }, [baseFiltered, onlyOpen]);

  return (
    <motion.div
      drag="y"
      dragConstraints={{ top: 0, bottom: snaps.min }}
      dragElastic={0.1}
      onDragEnd={handleDragEnd}
      animate={controls}
      initial={{ y: snaps.min }}
      className="fixed bottom-0 left-0 right-0 z-[60] touch-none"
      style={{ height: "85vh" }}
    >
      <div className="relative h-full w-full bg-card/95 backdrop-blur-2xl border-t-4 border-primary/30 rounded-t-[3.5rem] shadow-[0_-30px_60px_rgba(0,0,0,0.7)] flex flex-col overflow-hidden">
        {/* Drag Handle */}
        <div 
          className="w-full flex flex-col items-center pt-4 pb-2 cursor-grab active:cursor-grabbing select-none"
          onClick={() => setIsOpen(!isOpen)}
        >
          <div className="w-14 h-1.5 bg-primary/20 rounded-full mb-2" />
          <div className="flex items-center gap-2 text-primary font-black italic tracking-tighter uppercase text-[9px]">
            <GripHorizontal className="h-3 w-3 opacity-50" />
            {isOpen ? "Drag to minimize" : "Drag to explore"}
          </div>
        </div>

        {/* Content - Needs to allow scrolling without triggering drag */}
        <div className="flex-1 flex flex-col overflow-hidden touch-auto pointer-events-auto">
          <div className="px-6 pb-4">
            <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden snap-x">
              <button
                onClick={() => setActiveCategory("All")}
                className={cn(
                  "shrink-0 snap-start rounded-full border px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-all",
                  activeCategory === "All"
                    ? "bg-primary border-primary text-primary-foreground shadow-sm"
                    : "bg-background border-border text-muted-foreground hover:border-primary/30",
                )}
              >
                All
              </button>
              {(cuisines ?? []).map((name) => (
                <button
                  key={name}
                  onClick={() => setActiveCategory(name)}
                  className={cn(
                    "shrink-0 snap-start rounded-full border px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-all",
                    activeCategory === name
                      ? "bg-primary border-primary text-primary-foreground shadow-sm"
                      : "bg-background border-border text-muted-foreground hover:border-primary/30",
                  )}
                >
                  {name}
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
            <div className="flex items-center gap-1.5 label-row">
              <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
              {PRICE_RANGES.map((pr) => (
                <button
                  key={pr}
                  onClick={() => setPriceRangeFilter(priceRangeFilter === pr ? null : pr)}
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
            </div>
          </div>

          <div className="flex-1 min-w-0 overflow-x-hidden overflow-y-auto px-6 pb-20 custom-scrollbar overscroll-contain">
            <div className="min-w-0 space-y-5">
              <div className="sticky top-0 z-10 -mx-6 flex items-center justify-between border-b border-border/50 bg-card/95 px-6 py-2 backdrop-blur-sm">
                <h3 className="text-xs font-black italic tracking-tighter text-muted-foreground/60 uppercase">
                  {filteredRestaurants.length} Restaurants Found
                </h3>
              </div>

              {filteredRestaurants.map((res) => (
                <div
                  key={res.id}
                  ref={(el) => { cardRefs.current[res.id] = el; }}
                  className="min-w-0"
                >
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => onRestaurantClick?.(res.id)}
                    className={cn(
                      "group relative flex w-full min-w-0 flex-col gap-4 p-5 rounded-[2.5rem] bg-background/40 border transition-all active:scale-[0.98] shadow-sm text-left overflow-hidden cursor-pointer",
                      highlightedRestaurantId === res.id
                        ? "border-primary ring-2 ring-primary/50 bg-primary/5"
                        : "border-primary/5 hover:border-primary/40 hover:bg-muted/80",
                    )}
                  >
                    <div className="grid min-w-0 items-start grid-cols-1">
                      <div className="min-w-0 flex flex-col gap-1.5 overflow-hidden">
                        <div className="flex min-w-0 items-start justify-between gap-3">
                          <h4 className="min-w-0 flex-1 text-lg font-black italic tracking-tighter text-foreground uppercase group-hover:text-primary transition-colors overflow-hidden">
                            <span className="line-clamp-1 block">{res.name}</span>
                          </h4>
                          <div className="flex shrink-0 items-center gap-2">
                            {res.addedBy && (
                              <div className="shrink-0">
                                {res.addedBy.avatarUrl ? (
                                  <Image
                                    src={res.addedBy.avatarUrl}
                                    alt={res.addedBy.username ?? "User"}
                                    width={32}
                                    height={32}
                                    className="h-8 w-8 rounded-full border-2 border-primary/20 object-cover shadow-sm"
                                  />
                                ) : (
                                  <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-primary/20 bg-muted text-[10px] font-black text-muted-foreground uppercase shadow-sm">
                                    {(res.addedBy.username ?? "?")[0]}
                                  </div>
                                )}
                              </div>
                            )}
                            {res.distance != null && (
                              <div className="flex shrink-0 items-center gap-1 overflow-hidden bg-primary/10 px-3 py-1 rounded-full border border-primary/20">
                                <span className="line-clamp-1 block text-[10px] font-black text-primary uppercase">
                                  {res.distance.toFixed(1)} mi
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                        {res.status && res.status !== "WANT_TO_GO" && (
                          <span className={cn(
                            "self-start rounded-full px-2 py-0.5 text-[8px] font-black uppercase tracking-widest",
                            res.status === "VISITED" && "bg-emerald-500/15 text-emerald-600",
                            res.status === "FAVORITE" && "bg-primary/15 text-primary",
                            res.status === "WARNING_ZONE" && "bg-destructive/15 text-destructive",
                          )}>
                            {res.status === "VISITED" ? "Visited" : res.status === "FAVORITE" ? "Favorite" : "Warning"}
                          </span>
                        )}
                        <p className="line-clamp-1 text-[10px] text-muted-foreground">
                          {res.formattedAddress ?? res.address}
                        </p>
                        <div className="flex items-center gap-2">
                          <UtensilsCrossed className="h-3 w-3 text-muted-foreground" />
                          <p className="text-[10px] font-black uppercase text-muted-foreground">
                            {res.cuisineTypes?.[0] || "Gourmet"} • {res.priceRange || "—"}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function getTodaysHours(weekdayText: string[] | undefined): string | null {
  if (!weekdayText?.length) return null;
  const fullNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const abbrevs = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const jsDay = new Date().getDay();
  const todayFull = fullNames[jsDay];
  const todayAbbrev = abbrevs[jsDay];
  const normalize = (s: string) => s.trim().replace(/\.$/, "");
  for (const line of weekdayText) {
    const [dayPartRaw] = line.split(":");
    if (!dayPartRaw) continue;
    const dayPart = dayPartRaw.trim();
    if (dayPart.toLowerCase() === todayFull.toLowerCase() || dayPart.toLowerCase() === todayAbbrev.toLowerCase()) return line;
    const tokens = dayPart.split(/[,，]/).map((t) => normalize(t));
    for (const token of tokens) {
      if (!token) continue;
      const rangeMatch = token.split(/[-–]/).map((t) => normalize(t));
      if (rangeMatch.length === 2) {
        const startIdx = abbrevs.findIndex((a, i) => a.toLowerCase() === rangeMatch[0].toLowerCase() || fullNames[i].toLowerCase() === rangeMatch[0].toLowerCase());
        const endIdx = abbrevs.findIndex((a, i) => a.toLowerCase() === rangeMatch[1].toLowerCase() || fullNames[i].toLowerCase() === rangeMatch[1].toLowerCase());
        if (startIdx !== -1 && endIdx !== -1 && jsDay >= startIdx && jsDay <= endIdx) return line;
      } else if (token.toLowerCase() === todayAbbrev.toLowerCase() || token.toLowerCase() === todayFull.toLowerCase()) return line;
    }
  }
  return null;
}

function getOpenUntil(weekdayText: string[] | undefined): string | null {
  const line = getTodaysHours(weekdayText);
  if (!line) return null;
  const afterColon = line.includes(":") ? line.slice(line.indexOf(":") + 1).trim() : line;
  if (!afterColon || /closed/i.test(afterColon)) return "Closed";
  const ranges = afterColon.split(/[,，]/).map((r) => r.trim());
  const lastRange = ranges[ranges.length - 1];
  const dash = lastRange.match(/\s+[–-]\s+/);
  if (!dash) return null;
  const closing = lastRange.slice((dash.index ?? 0) + (dash[0]?.length ?? 0)).trim();
  return closing ? `Open until ${closing}` : null;
}

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 3958.8; // Miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}
