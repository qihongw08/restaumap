"use client";

import { useMemo, useEffect } from "react";
import {
  APIProvider,
  Map,
  AdvancedMarker,
  type MapCameraChangedEvent,
} from "@vis.gl/react-google-maps";
import type { MarkerData } from "@/types/restaurant";
import type { VisitLogMarker } from "@/types/visit";
import { LocationButton } from "@/components/map/location-button";
import { useLocation } from "@/hooks/use-location";
import { Camera } from "lucide-react";
import Image from "next/image";
import { differenceInCalendarDays, formatDistanceToNowStrict } from "date-fns";

const R2_BASE = process.env.NEXT_PUBLIC_R2_PUBLIC_URL ?? "";
function isR2Url(url: string) {
  return R2_BASE.length > 0 && url.startsWith(R2_BASE);
}

/** Returns border color + glow classes based on how recent a visit is */
function getRecencyStyle(visitDate: string): {
  border: string;
  glow: string;
  label: string;
} {
  const now = Date.now();
  const then = new Date(visitDate).getTime();
  const daysAgo = Math.floor((now - then) / (1000 * 60 * 60 * 24));

  if (daysAgo < 7)
    return {
      border: "border-emerald-400",
      glow: "shadow-[0_0_12px_rgba(52,211,153,0.5)]",
      label: formatDistanceToNowStrict(new Date(visitDate), {
        addSuffix: true,
      }),
    };
  if (daysAgo < 30)
    return {
      border: "border-primary",
      glow: "shadow-[0_0_10px_rgba(255,215,0,0.4)]",
      label: formatDistanceToNowStrict(new Date(visitDate), {
        addSuffix: true,
      }),
    };
  if (daysAgo < 90)
    return {
      border: "border-amber-400",
      glow: "",
      label: formatDistanceToNowStrict(new Date(visitDate), {
        addSuffix: true,
      }),
    };
  if (daysAgo < 180)
    return {
      border: "border-orange-300",
      glow: "",
      label: formatDistanceToNowStrict(new Date(visitDate), {
        addSuffix: true,
      }),
    };
  return {
    border: "border-stone-300",
    glow: "",
    label: formatDistanceToNowStrict(new Date(visitDate), { addSuffix: true }),
  };
}

function shortRelativeTime(visitDate: string): string {
  const days = differenceInCalendarDays(new Date(), new Date(visitDate));

  if (days <= 0) return "Today";
  if (days < 7) return `${days}d`;
  if (days < 30) return `${Math.floor(days / 7)}w`;
  if (days < 365) return `${Math.floor(days / 30)}mo`;
  return `${Math.floor(days / 365)}y`;
}

export interface VisitLogGroup {
  restaurant: VisitLogMarker["restaurant"];
  markers: VisitLogMarker[];
  latestPhoto?: string;
}

export interface RestaurantMapProps {
  markers: MarkerData[];
  center?: { lat: number; lng: number };
  zoom?: number;
  selectedRestaurantId?: string | null;
  onMarkerClick?: (restaurantId: string) => void;
  onCameraChanged?: (ev: MapCameraChangedEvent) => void;
  visitLogGroups?: Record<string, VisitLogGroup>;
  selectedLogRestaurantId?: string | null;
  onLogMarkerClick?: (restaurantId: string) => void;
}

export function RestaurantMap({
  markers,
  center = { lat: 40.7, lng: -74 },
  zoom = 10,
  selectedRestaurantId = null,
  onMarkerClick,
  onCameraChanged,
  visitLogGroups,
  selectedLogRestaurantId = null,
  onLogMarkerClick,
}: RestaurantMapProps) {
  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const { coords, getLocation } = useLocation();

  useEffect(() => {
    getLocation();
  }, [getLocation]);

  const withCoords = useMemo(
    () =>
      markers.filter((m) => m.latitude != null && m.longitude != null) as Array<
        MarkerData & { latitude: number; longitude: number }
      >,
    [markers],
  );

  const logGroupEntries = useMemo(
    () => (visitLogGroups ? Object.entries(visitLogGroups) : []),
    [visitLogGroups],
  );

  if (!key) {
    return (
      <div className="flex h-[400px] items-center justify-center rounded-lg border border-border bg-muted text-muted-foreground">
        Set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to show the map.
      </div>
    );
  }

  return (
    <APIProvider apiKey={key}>
      <div className="relative h-screen w-full">
        <Map
          center={center}
          zoom={zoom}
          onCameraChanged={onCameraChanged}
          mapId="restaurant-map"
          className="h-full w-full"
          gestureHandling="greedy"
          disableDefaultUI={true}
          style={{ width: "100%", height: "100%" }}
          backgroundColor="#e8e6e1"
        >
          {coords && (
            <AdvancedMarker
              position={{ lat: coords.latitude, lng: coords.longitude }}
              title="Your location"
              zIndex={100}
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500 border-4 border-white shadow-lg">
                <div className="h-2 w-2 rounded-full bg-white" />
              </div>
            </AdvancedMarker>
          )}

          {/* Restaurant markers (Spots mode) */}
          {withCoords.map((m) => (
            <AdvancedMarker
              key={m.id}
              position={{ lat: m.latitude, lng: m.longitude }}
              title={m.name}
              onClick={() => onMarkerClick?.(m.id)}
            >
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-full border-4 border-background shadow-2xl transition-transform hover:scale-110 cursor-pointer ${
                  selectedRestaurantId === m.id
                    ? "bg-primary ring-4 ring-primary/50 scale-110"
                    : "bg-primary"
                }`}
              >
                <div className="h-2 w-2 rounded-full bg-primary-foreground animate-pulse" />
              </div>
            </AdvancedMarker>
          ))}

          {/* Visit log markers (Logs mode) */}
          {logGroupEntries.map(([restaurantId, group]) => {
            const latestDate = group.markers[0]?.visitDate;
            const recency = latestDate ? getRecencyStyle(latestDate) : null;
            const timeChip = latestDate ? shortRelativeTime(latestDate) : "";
            return (
              <AdvancedMarker
                key={`log-${restaurantId}`}
                position={{
                  lat: group.restaurant.latitude,
                  lng: group.restaurant.longitude,
                }}
                title={group.restaurant.name}
                onClick={() => onLogMarkerClick?.(restaurantId)}
              >
                <div className="flex flex-col items-center gap-1">
                  <div
                    className={`relative h-12 w-12 cursor-pointer overflow-hidden rounded-2xl border-[3px] transition-transform hover:scale-110 ${
                      recency?.border ?? "border-white"
                    } ${recency?.glow ?? ""} ${
                      selectedLogRestaurantId === restaurantId
                        ? "ring-4 ring-primary/50 scale-110"
                        : ""
                    }`}
                  >
                    {group.latestPhoto ? (
                      isR2Url(group.latestPhoto) ? (
                        <Image
                          src={group.latestPhoto}
                          alt=""
                          fill
                          className="object-cover"
                        />
                      ) : (
                        /* eslint-disable-next-line @next/next/no-img-element -- Fallback */
                        <img
                          src={group.latestPhoto}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      )
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-primary/20">
                        <Camera className="h-4 w-4 text-primary" />
                      </div>
                    )}
                    {group.markers.length > 1 && (
                      <div className="absolute -right-0.5 -top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[9px] font-black text-primary-foreground shadow-md">
                        {group.markers.length}
                      </div>
                    )}
                  </div>
                  {timeChip && (
                    <span className="rounded-full bg-black/60 px-1.5 py-0.5 text-[8px] font-bold text-white backdrop-blur-sm">
                      {timeChip}
                    </span>
                  )}
                </div>
              </AdvancedMarker>
            );
          })}

          <div className="absolute right-4 bottom-36 z-[60]">
            <LocationButton />
          </div>
        </Map>
      </div>
    </APIProvider>
  );
}
