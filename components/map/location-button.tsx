'use client';

import { useMap } from '@vis.gl/react-google-maps';
import { useLocation } from '@/hooks/use-location';
import { useCallback, useEffect } from 'react';
import { MapPin } from 'lucide-react';

export function LocationButton() {
  const map = useMap();
  const { coords, getLocation, isLoading, error } = useLocation();

  const goToMyLocation = useCallback(() => {
    if (!map) return;
    getLocation();
  }, [map, getLocation]);

  useEffect(() => {
    if (!map || !coords) return;
    map.panTo({ lat: coords.latitude, lng: coords.longitude });
    map.setZoom(14);
  }, [map, coords]);

  return (
    <button
      type="button"
      onClick={goToMyLocation}
      disabled={isLoading}
      className="absolute bottom-4 right-4 flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white shadow-md transition hover:bg-gray-50 disabled:opacity-60"
      title={error ?? 'Center on my location'}
      aria-label="Center on my location"
    >
      <MapPin className="h-5 w-5 text-[#FF6B6B]" />
    </button>
  );
}
