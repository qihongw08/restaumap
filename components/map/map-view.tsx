"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import useSWR from "swr";
import { RestaurantMap } from "@/components/map/restaurant-map";
import { NearbyBottomSheet } from "@/components/map/nearby-bottom-sheet";
import { VisitLogCard } from "@/components/visits/visit-log-card";
import type { MarkerData } from "@/types/restaurant";
import type { VisitLogMarker, VisitLogWithLocation } from "@/types/visit";
import type { RestaurantWithDetails } from "@/types/restaurant";
import { Loader2 } from "lucide-react";
import { getVisitMarkersAction, getVisitsAction } from "@/app/actions/visits";
import { getCuisinesAction, getRestaurantsAction, getRestaurantMarkersAction } from "@/app/actions/restaurants";

const EMPTY_ARRAY: any[] = [];

const DEFAULT_CENTER = { lat: 40.7, lng: -74 };
const DEFAULT_ZOOM = 10;
const SELECTED_ZOOM = 15;

type Bounds = {
  south: number;
  west: number;
  north: number;
  east: number;
};

interface MapViewProps {
  markers?: MarkerData[];
  visitLogMarkers?: VisitLogMarker[];
  highlightRestaurantId?: string | null;
  selectedGroupId?: string | null;
  groupOptions?: Array<{ id: string; name: string }>;
  shareToken?: string | null;
  restaurants?: RestaurantWithDetails[];
  showPhotos?: boolean;
  currentUserId?: string | null;
  initialHasLogs?: boolean;
}

export function MapView({
  markers: markersProp,
  visitLogMarkers: visitLogMarkersProp = EMPTY_ARRAY,
  highlightRestaurantId = null,
  selectedGroupId = null,
  groupOptions = EMPTY_ARRAY,
  shareToken = null,
  restaurants,
  showPhotos = true,
  currentUserId = null,
  initialHasLogs = false,
}: MapViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [markers, setMarkers] = useState<MarkerData[]>(markersProp ?? EMPTY_ARRAY);
  const [logMarkers, setLogMarkers] = useState<VisitLogMarker[]>(visitLogMarkersProp ?? EMPTY_ARRAY);
  const [isMarkersLoading, setIsMarkersLoading] = useState(false);
  const [hasInitialFetchOccurred, setHasInitialFetchOccurred] = useState(false);

  const [selectedRestaurantId, setSelectedRestaurantId] = useState<
    string | null
  >(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [mapCenter, setMapCenter] = useState(DEFAULT_CENTER);
  const [mapZoom, setMapZoom] = useState(DEFAULT_ZOOM);
  const [groupMenuOpen, setGroupMenuOpen] = useState(false);
  const [mapMode, setMapMode] = useState<"spots" | "logs">("spots");
  const [selectedLogRestaurantId, setSelectedLogRestaurantId] = useState<
    string | null
  >(null);
  const [bounds, setBounds] = useState<Bounds | null>(null);
  const [appliedSpotsBounds, setAppliedSpotsBounds] = useState<Bounds | null>(
    null,
  );
  const [appliedLogBounds, setAppliedLogBounds] = useState<Bounds | null>(null);

  useEffect(() => {
    if (markersProp && markersProp.length > 0) {
      setMarkers(markersProp);
    }
  }, [markersProp]);

  useEffect(() => {
    if (visitLogMarkersProp && visitLogMarkersProp.length > 0) {
      setLogMarkers(visitLogMarkersProp);
    }
  }, [visitLogMarkersProp]);

  const markersInAppliedBounds = useMemo(() => {
    if (!appliedSpotsBounds) return markers;
    const b = appliedSpotsBounds;
    return markers.filter((m) => {
      if (m.latitude == null || m.longitude == null) return false;
      return (
        m.latitude >= b.south &&
        m.latitude <= b.north &&
        m.longitude >= b.west &&
        m.longitude <= b.east
      );
    });
  }, [markers, appliedSpotsBounds]);

  useEffect(() => {
    if (
      !highlightRestaurantId ||
      !markers.some((m) => m.id === highlightRestaurantId)
    )
      return;
    const id = highlightRestaurantId;
    const marker = markers.find((m) => m.id === id);
    const t = setTimeout(() => {
      setSelectedRestaurantId(id);
      setSheetOpen(true);
      if (marker?.latitude != null && marker?.longitude != null) {
        setMapCenter({ lat: marker.latitude, lng: marker.longitude });
        setMapZoom(SELECTED_ZOOM);
      }
    }, 0);
    return () => clearTimeout(t);
  }, [highlightRestaurantId, markers]);

  const getRestaurantHref = useCallback(
    (id: string) =>
      shareToken
        ? `/restaurants/${id}?shareToken=${encodeURIComponent(shareToken)}`
        : `/restaurants/${id}`,
    [shareToken],
  );

  const handleMarkerClick = useCallback(
    (id: string) => {
      if (selectedRestaurantId === id) {
        router.push(getRestaurantHref(id));
        return;
      }
      const marker = markers.find((m) => m.id === id);
      if (marker?.latitude != null && marker?.longitude != null) {
        setMapCenter({ lat: marker.latitude, lng: marker.longitude });
        setMapZoom(SELECTED_ZOOM);
      }
      setSelectedRestaurantId(id);
      setSheetOpen(true);
    },
    [selectedRestaurantId, markers, router, getRestaurantHref],
  );

  const handleLogMarkerClick = useCallback(
    (restaurantId: string) => {
      const marker = logMarkers.find(
        (v) => v.restaurantId === restaurantId,
      );
      if (marker) {
        setMapCenter({
          lat: marker.restaurant.latitude,
          lng: marker.restaurant.longitude,
        });
        setMapZoom(SELECTED_ZOOM);
      }
      setSelectedLogRestaurantId(restaurantId);
      setSheetOpen(true);
    },
    [logMarkers],
  );

  const handleSearchLogsHere = useCallback(async () => {
    if (!bounds) return;
    setAppliedLogBounds(bounds);
    const res = await getVisitMarkersAction({
      groupId: selectedGroupId,
      minLat: bounds.south,
      maxLat: bounds.north,
      minLng: bounds.west,
      maxLng: bounds.east,
      limit: 200,
    });
    if (res?.serverError || res?.validationErrors || !res?.data) return;
    setLogMarkers((res.data.data as VisitLogMarker[]) ?? []);
  }, [bounds, selectedGroupId]);

  const handleCameraChange = useCallback(
    (ev: {
      detail: {
        center?: { lat: number; lng: number };
        zoom?: number;
        bounds?: Bounds;
      };
    }) => {
      const { center, zoom, bounds: b } = ev.detail ?? {};
      if (center) setMapCenter(center);
      if (typeof zoom === "number") setMapZoom(zoom);
      if (b) setBounds(b);
    },
    [],
  );

  const handleSheetOpenChange = (open: boolean) => {
    setSheetOpen(open);
  };

  const handleGroupChange = (nextGroupId: string) => {
    setGroupMenuOpen(false);
    const params = new URLSearchParams(searchParams.toString());
    if (nextGroupId) params.set("groupId", nextGroupId);
    else params.delete("groupId");
    params.delete("restaurant");
    router.push(`/map${params.toString() ? `?${params.toString()}` : ""}`);
  };

  const selectedGroupName =
    groupOptions.find((group) => group.id === selectedGroupId)?.name ?? "All";

  // Group visit log markers by restaurant
  const groupedLogMarkers = useMemo(() => {
    return logMarkers.reduce<
      Record<
        string,
        {
          restaurant: VisitLogMarker["restaurant"];
          markers: VisitLogMarker[];
          latestPhoto?: string;
        }
      >
    >((acc, v) => {
      if (!acc[v.restaurantId]) {
        acc[v.restaurantId] = {
          restaurant: v.restaurant,
          markers: [],
          latestPhoto: v.firstPhotoUrl ?? undefined,
        };
      }
      acc[v.restaurantId].markers.push(v);
      return acc;
    }, {});
  }, [logMarkers]);

  const canSearchLogsHere =
    mapMode === "logs" &&
    bounds &&
    (!appliedLogBounds ||
      bounds.south !== appliedLogBounds.south ||
      bounds.north !== appliedLogBounds.north ||
      bounds.west !== appliedLogBounds.west ||
      bounds.east !== appliedLogBounds.east);

  const canSearchSpotsHere =
    mapMode === "spots" &&
    bounds &&
    (!appliedSpotsBounds ||
      bounds.south !== appliedSpotsBounds.south ||
      bounds.north !== appliedSpotsBounds.north ||
      bounds.west !== appliedSpotsBounds.west ||
      bounds.east !== appliedSpotsBounds.east);

  const handleSearchSpotsHere = useCallback(async () => {
    if (!bounds) return;
    setAppliedSpotsBounds(bounds);
    setIsMarkersLoading(true);
    try {
      const res = await getRestaurantMarkersAction({
        groupId: selectedGroupId,
        minLat: bounds.south,
        maxLat: bounds.north,
        minLng: bounds.west,
        maxLng: bounds.east,
      });
      if (res?.data) {
        setMarkers(res.data);
      }
    } finally {
      setIsMarkersLoading(false);
    }
  }, [bounds, selectedGroupId]);

  useEffect(() => {
    if (bounds && !hasInitialFetchOccurred && markers.length === 0 && logMarkers.length === 0) {
      setHasInitialFetchOccurred(true);
      if (mapMode === "spots") {
        handleSearchSpotsHere();
      } else {
        handleSearchLogsHere();
      }
    }
  }, [bounds, hasInitialFetchOccurred, markers.length, logMarkers.length, mapMode, handleSearchSpotsHere, handleSearchLogsHere]);

  const handleRestaurantClick = useCallback(
    (id: string) => {
      if (selectedRestaurantId === id) {
        router.push(getRestaurantHref(id));
        return;
      }
      const rest = restaurants?.find((r) => r.id === id);
      if (rest?.latitude != null && rest?.longitude != null) {
        setMapCenter({ lat: rest.latitude, lng: rest.longitude });
        setMapZoom(SELECTED_ZOOM);
      }
      setSelectedRestaurantId(id);
      setSheetOpen(true);
    },
    [selectedRestaurantId, restaurants, router, getRestaurantHref],
  );

  return (
    <>
      {!shareToken && (
        <div className="pointer-events-none absolute left-1/2 top-28 z-[60] w-[calc(100%-2rem)] max-w-[260px] -translate-x-1/2">
          <div className="pointer-events-auto relative space-y-2 rounded-xl border border-primary/20 bg-background/95 px-3 py-2 shadow-lg backdrop-blur">
            {groupOptions.length > 0 && (
              <div className="flex items-center gap-2">
                <p className="shrink-0 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                  Group
                </p>
                <div className="min-w-0 flex-1">
                  <button
                    type="button"
                    onClick={() => setGroupMenuOpen((o) => !o)}
                    className="flex w-full min-w-0 items-center justify-between gap-2 rounded-md bg-background px-2 py-1 text-xs font-semibold text-foreground"
                    aria-label="Choose group for map"
                    aria-expanded={groupMenuOpen}
                  >
                    <span className="min-w-0 flex-1 overflow-hidden text-left">
                      <span className="line-clamp-1 block">
                        {selectedGroupName}
                      </span>
                    </span>
                    <span className="shrink-0 text-[10px] text-muted-foreground">
                      {groupMenuOpen ? "▲" : "▼"}
                    </span>
                  </button>
                  {groupMenuOpen && (
                    <div className="absolute left-3 right-3 top-[calc(100%+6px)] max-h-48 overflow-y-auto rounded-lg bg-background p-1 shadow-xl">
                      <button
                        type="button"
                        onClick={() => handleGroupChange("")}
                        className="w-full rounded-md px-2 py-1.5 text-left text-xs font-semibold text-foreground hover:bg-muted/60"
                      >
                        <span className="line-clamp-1 block">All</span>
                      </button>
                      {groupOptions.map((group) => (
                        <button
                          key={group.id}
                          type="button"
                          onClick={() => handleGroupChange(group.id)}
                          className="w-full rounded-md px-2 py-1.5 text-left text-xs font-semibold text-foreground hover:bg-muted/60"
                        >
                          <span className="line-clamp-1 block">
                            {group.name}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {(logMarkers.length > 0 || initialHasLogs) && (
              <div className="flex rounded-full bg-muted/50 p-0.5">
                <button
                  type="button"
                  onClick={() => {
                    setMapMode("spots");
                    setSelectedLogRestaurantId(null);
                  }}
                  className={`flex-1 rounded-full py-1.5 text-[10px] font-black uppercase tracking-widest transition-all ${
                    mapMode === "spots"
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Spots
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMapMode("logs");
                    setSelectedRestaurantId(null);
                  }}
                  className={`flex-1 rounded-full py-1.5 text-[10px] font-black uppercase tracking-widest transition-all ${
                    mapMode === "logs"
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Logs
                </button>
              </div>
            )}

            {(canSearchSpotsHere || canSearchLogsHere) && (
              <button
                type="button"
                onClick={
                  canSearchSpotsHere
                    ? handleSearchSpotsHere
                    : handleSearchLogsHere
                }
                className="w-full rounded-full border border-border bg-background/95 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground shadow-sm"
              >
                Search this area
              </button>
            )}
          </div>
        </div>
      )}

      <RestaurantMap
        markers={mapMode === "spots" ? markersInAppliedBounds : []}
        selectedRestaurantId={selectedRestaurantId}
        onMarkerClick={handleMarkerClick}
        center={mapCenter}
        zoom={mapZoom}
        onCameraChanged={handleCameraChange}
        visitLogGroups={mapMode === "logs" ? groupedLogMarkers : undefined}
        selectedLogRestaurantId={selectedLogRestaurantId}
        onLogMarkerClick={handleLogMarkerClick}
      />

      {mapMode === "spots" ? (
        restaurants ? (
          /* Share pages pass full restaurant data */
          <NearbyBottomSheet
            restaurants={restaurants}
            highlightedRestaurantId={selectedRestaurantId}
            isOpen={sheetOpen}
            onOpenChange={handleSheetOpenChange}
            onRestaurantClick={handleRestaurantClick}
            showPhotos={showPhotos}
          />
        ) : (
          /* Normal map: bottom sheet fetches its own restaurant data */
          <SWRBottomSheet
            highlightedRestaurantId={selectedRestaurantId}
            isOpen={sheetOpen}
            onOpenChange={handleSheetOpenChange}
            onRestaurantClick={handleMarkerClick}
            appliedBounds={appliedSpotsBounds}
            groupId={selectedGroupId}
          />
        )
      ) : (
        <LogsBottomSheet
          restaurantId={selectedLogRestaurantId}
          isOpen={sheetOpen && selectedLogRestaurantId !== null}
          onOpenChange={handleSheetOpenChange}
          groupId={selectedGroupId}
          currentUserId={currentUserId}
        />
      )}
    </>
  );
}

/** Bottom sheet that fetches restaurant data via SWR with server-side filters */
function SWRBottomSheet({
  highlightedRestaurantId,
  isOpen,
  onOpenChange,
  onRestaurantClick,
  appliedBounds,
  groupId,
}: {
  highlightedRestaurantId: string | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onRestaurantClick: (id: string) => void;
  appliedBounds: Bounds | null;
  groupId: string | null;
}) {
  const [category, setCategory] = useState("All");
  const [priceRange, setPriceRange] = useState<string | null>(null);
  const [restaurants, setRestaurants] = useState<RestaurantWithDetails[]>([]);
  const [cuisines, setCuisines] = useState<string[]>([]);

  // Fetch available cuisines once
  useEffect(() => {
    getCuisinesAction().then((res) => {
      if (res?.data) setCuisines(res.data);
    });
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await getRestaurantsAction({
          limit: 20,
          groupId: groupId || undefined,
          cuisine: category !== "All" ? category : undefined,
          priceRange: priceRange || undefined,
          minLat: appliedBounds?.south,
          maxLat: appliedBounds?.north,
          minLng: appliedBounds?.west,
          maxLng: appliedBounds?.east,
        });
        if (res?.serverError || res?.validationErrors || !res?.data) return;
        if (cancelled) return;
        setRestaurants(res.data.data as RestaurantWithDetails[]);
      } finally {
        // no-op
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [groupId, category, priceRange, appliedBounds, isOpen]);

  return (
    <>
      <NearbyBottomSheet
        restaurants={restaurants}
        highlightedRestaurantId={highlightedRestaurantId}
        isOpen={isOpen}
        onOpenChange={onOpenChange}
        onRestaurantClick={onRestaurantClick}
        controlledCategory={category}
        onCategoryChange={setCategory}
        controlledPriceRange={priceRange}
        onPriceRangeChange={setPriceRange}
        cuisines={cuisines}
      />
    </>
  );
}

/** Fetches visit logs for a restaurant and displays them */
function LogsBottomSheet({
  restaurantId,
  isOpen,
  onOpenChange,
  groupId,
  currentUserId,
}: {
  restaurantId: string | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  groupId: string | null;
  currentUserId: string | null;
}) {
  const { data, isLoading } = useSWR(
    restaurantId ? ["visits", restaurantId, groupId] : null,
    async () => {
      if (!restaurantId) return { data: [] as VisitLogWithLocation[] };
      const res = await getVisitsAction({ 
        restaurantId, 
        groupId: groupId || undefined,
        limit: 10 
      });
      return { data: (res?.data?.data as VisitLogWithLocation[]) ?? [] };
    }
  );

  if (!isOpen || !restaurantId) return null;

  const visits = data?.data ?? [];

  return (
    <div className="fixed inset-x-0 bottom-0 z-[60] max-h-[70vh] overflow-y-auto rounded-t-[2rem] border-t border-black/10 bg-background shadow-2xl">
      <div className="flex justify-center pt-3 pb-1">
        <div className="h-1 w-10 rounded-full bg-muted-foreground/30" />
      </div>
      <div className="px-4 pb-6 pt-2">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground">
            Visit logs
          </h3>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-full px-3 py-1 text-xs font-bold text-muted-foreground hover:bg-muted"
          >
            Close
          </button>
        </div>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : visits.length === 0 ? (
          <p className="py-4 text-sm text-muted-foreground">
            No visits logged here yet.
          </p>
        ) : (
          <ul className="space-y-4">
            {visits.map((v) => (
              <li key={v.id}>
                <VisitLogCard
                  visit={{
                    ...v,
                    restaurant: {
                      id: v.restaurant.id,
                      name: v.restaurant.name,
                    },
                  }}
                  displayName={v.creator?.username ?? undefined}
                  avatarUrl={v.creator?.avatarUrl ?? undefined}
                  editable={v.userId === currentUserId}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
