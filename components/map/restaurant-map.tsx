"use client";

import { useMemo, useEffect } from "react";
import { APIProvider, Map, AdvancedMarker } from "@vis.gl/react-google-maps";
import type { RestaurantWithVisits } from "@/types/restaurant";
import { LocationButton } from "@/components/map/location-button";
import { useLocation } from "@/hooks/use-location";

interface RestaurantMapProps {
  restaurants: RestaurantWithVisits[];
  center?: { lat: number; lng: number };
  zoom?: number;
  selectedRestaurantId?: string | null;
  onMarkerClick?: (restaurantId: string) => void;
}

export function RestaurantMap({
  restaurants,
  center = { lat: 40.7, lng: -74 },
  zoom = 10,
  selectedRestaurantId = null,
  onMarkerClick,
}: RestaurantMapProps) {
  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const { coords, getLocation } = useLocation();

  useEffect(() => {
    getLocation();
  }, [getLocation]);

  const withCoords = useMemo(
    () =>
      restaurants.filter(
        (r) => r.latitude != null && r.longitude != null,
      ) as Array<
        RestaurantWithVisits & { latitude: number; longitude: number }
      >,
    [restaurants],
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
          defaultCenter={center}
          defaultZoom={zoom}
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
          {withCoords.map((r) => (
            <AdvancedMarker
              key={r.id}
              position={{ lat: r.latitude, lng: r.longitude }}
              title={r.name}
              onClick={() => onMarkerClick?.(r.id)}
            >
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-full border-4 border-background shadow-2xl transition-transform hover:scale-110 cursor-pointer ${
                  selectedRestaurantId === r.id
                    ? "bg-primary ring-4 ring-primary/50 scale-110"
                    : "bg-primary"
                }`}
              >
                <div className="h-2 w-2 rounded-full bg-primary-foreground animate-pulse" />
              </div>
            </AdvancedMarker>
          ))}
          <div className="absolute top-36 right-6">
            <LocationButton />
          </div>
        </Map>
      </div>
    </APIProvider>
  );
}
