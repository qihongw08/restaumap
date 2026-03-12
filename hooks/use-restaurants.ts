'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import type { RestaurantWithVisits } from '@/types/restaurant';

export function useRestaurants(options?: {
  status?: string;
  excludeBlacklisted?: boolean;
  initialData?: RestaurantWithVisits[];
}) {
  const hasInitialData = useRef(options?.initialData !== undefined);
  const [restaurants, setRestaurants] = useState<RestaurantWithVisits[]>(options?.initialData ?? []);
  const [isLoading, setIsLoading] = useState(!hasInitialData.current);
  const [error, setError] = useState<string | null>(null);

  const fetchRestaurants = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (options?.status) params.set('status', options.status);
      if (options?.excludeBlacklisted === false) params.set('excludeBlacklisted', 'false');
      const res = await fetch(`/api/restaurants?${params}`);
      if (!res.ok) throw new Error('Failed to fetch restaurants');
      const json = await res.json();
      setRestaurants(json.data ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
      setRestaurants([]);
    } finally {
      setIsLoading(false);
    }
  }, [options?.status, options?.excludeBlacklisted]);

  useEffect(() => {
    if (!hasInitialData.current) {
      fetchRestaurants();
    }
  }, [fetchRestaurants]);

  return { restaurants, isLoading, error, refetch: fetchRestaurants };
}
