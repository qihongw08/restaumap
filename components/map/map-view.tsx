"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { RestaurantMap } from "@/components/map/restaurant-map";
import { NearbyBottomSheet } from "@/components/map/nearby-bottom-sheet";
import type { RestaurantWithDetails } from "@/types/restaurant";

const DEFAULT_CENTER = { lat: 40.7, lng: -74 };
const DEFAULT_ZOOM = 10;
const SELECTED_ZOOM = 15;

interface MapViewProps {
  restaurants: RestaurantWithDetails[];
  highlightRestaurantId?: string | null;
  selectedGroupId?: string | null;
  groupOptions?: Array<{ id: string; name: string }>;
  shareToken?: string | null;
  showPhotos?: boolean;
}

export function MapView({
  restaurants,
  highlightRestaurantId = null,
  selectedGroupId = null,
  groupOptions = [],
  shareToken = null,
  showPhotos = true,
}: MapViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<
    string | null
  >(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [mapCenter, setMapCenter] = useState(DEFAULT_CENTER);
  const [mapZoom, setMapZoom] = useState(DEFAULT_ZOOM);
  const [groupMenuOpen, setGroupMenuOpen] = useState(false);

  useEffect(() => {
    if (
      !highlightRestaurantId ||
      !restaurants.some((r) => r.id === highlightRestaurantId)
    )
      return;
    const id = highlightRestaurantId;
    const rest = restaurants.find((r) => r.id === id);
    const t = setTimeout(() => {
      setSelectedRestaurantId(id);
      setSheetOpen(true);
      if (rest?.latitude != null && rest?.longitude != null) {
        setMapCenter({ lat: rest.latitude, lng: rest.longitude });
        setMapZoom(SELECTED_ZOOM);
      }
    }, 0);
    return () => clearTimeout(t);
  }, [highlightRestaurantId, restaurants]);

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
      const rest = restaurants.find((r) => r.id === id);
      if (rest?.latitude != null && rest?.longitude != null) {
        setMapCenter({ lat: rest.latitude, lng: rest.longitude });
        setMapZoom(SELECTED_ZOOM);
      }
      setSelectedRestaurantId(id);
      setSheetOpen(true);
    },
    [selectedRestaurantId, restaurants, router, getRestaurantHref],
  );

  const handleCameraChange = useCallback(
    (ev: {
      detail: { center?: { lat: number; lng: number }; zoom?: number };
    }) => {
      const { center, zoom } = ev.detail ?? {};
      if (center) setMapCenter(center);
      if (typeof zoom === "number") setMapZoom(zoom);
    },
    [],
  );

  const handleRestaurantClick = useCallback(
    (id: string) => {
      if (selectedRestaurantId === id) {
        router.push(getRestaurantHref(id));
        return;
      }
      const rest = restaurants.find((r) => r.id === id);
      if (rest?.latitude != null && rest?.longitude != null) {
        setMapCenter({ lat: rest.latitude, lng: rest.longitude });
        setMapZoom(SELECTED_ZOOM);
      }
      setSelectedRestaurantId(id);
      setSheetOpen(true);
    },
    [selectedRestaurantId, restaurants, router, getRestaurantHref],
  );

  const handleSheetOpenChange = (open: boolean) => {
    setSheetOpen(open);
    if (!open) setSelectedRestaurantId(null);
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
    groupOptions.find((group) => group.id === selectedGroupId)?.name ??
    "All restaurants";

  return (
    <>
      {groupOptions.length > 0 && (
        <div className="pointer-events-none absolute left-1/2 top-28 z-[60] w-[calc(100%-2rem)] max-w-[250px] -translate-x-1/2">
          <div className="pointer-events-auto relative flex items-center gap-2 rounded-xl border border-primary/20 bg-background/95 px-3 py-2 shadow-lg backdrop-blur">
            <p className="shrink-0 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              Group
            </p>
            <div className="min-w-0 flex-1">
              <button
                type="button"
                onClick={() => setGroupMenuOpen((open) => !open)}
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
                <div className="absolute left-[58px] right-3 top-[calc(100%+6px)] max-h-48 overflow-y-auto rounded-lg bg-background p-1 shadow-xl">
                  <button
                    type="button"
                    onClick={() => handleGroupChange("")}
                    className="w-full rounded-md px-2 py-1.5 text-left text-xs font-semibold text-foreground hover:bg-muted/60"
                  >
                    <span className="line-clamp-1 block">All restaurants</span>
                  </button>
                  {groupOptions.map((group) => (
                    <button
                      key={group.id}
                      type="button"
                      onClick={() => handleGroupChange(group.id)}
                      className="w-full rounded-md px-2 py-1.5 text-left text-xs font-semibold text-foreground hover:bg-muted/60"
                    >
                      <span className="line-clamp-1 block">{group.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      <RestaurantMap
        restaurants={restaurants}
        selectedRestaurantId={selectedRestaurantId}
        onMarkerClick={handleMarkerClick}
        center={mapCenter}
        zoom={mapZoom}
        onCameraChanged={handleCameraChange}
      />
      <NearbyBottomSheet
        restaurants={restaurants}
        highlightedRestaurantId={selectedRestaurantId}
        isOpen={sheetOpen}
        onOpenChange={handleSheetOpenChange}
        onRestaurantClick={handleRestaurantClick}
        showPhotos={showPhotos}
      />
    </>
  );
}
