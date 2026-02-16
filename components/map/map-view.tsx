"use client";

import { useState } from "react";
import { RestaurantMap } from "@/components/map/restaurant-map";
import { NearbyBottomSheet } from "@/components/map/nearby-bottom-sheet";
import type { RestaurantWithDetails } from "@/types/restaurant";

interface MapViewProps {
  restaurants: RestaurantWithDetails[];
}

export function MapView({ restaurants }: MapViewProps) {
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const handleMarkerClick = (id: string) => {
    setSelectedRestaurantId(id);
    setSheetOpen(true);
  };

  const handleSheetOpenChange = (open: boolean) => {
    setSheetOpen(open);
    if (!open) setSelectedRestaurantId(null);
  };

  return (
    <>
      <RestaurantMap
        restaurants={restaurants}
        selectedRestaurantId={selectedRestaurantId}
        onMarkerClick={handleMarkerClick}
      />
      <NearbyBottomSheet
        restaurants={restaurants}
        highlightedRestaurantId={selectedRestaurantId}
        isOpen={sheetOpen}
        onOpenChange={handleSheetOpenChange}
      />
    </>
  );
}
