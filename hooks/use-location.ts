'use client';

import { useState, useEffect, useCallback } from 'react';

export interface Coords {
  latitude: number;
  longitude: number;
}

export function useLocation() {
  const [coords, setCoords] = useState<Coords | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const getLocation = useCallback(() => {
    if (!navigator?.geolocation) {
      setError('Geolocation not supported');
      return;
    }
    setIsLoading(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        });
        setIsLoading(false);
      },
      (err) => {
        setError(err.message || 'Location unavailable');
        setIsLoading(false);
      },
      { enableHighAccuracy: true }
    );
  }, []);

  return { coords, error, isLoading, getLocation };
}
