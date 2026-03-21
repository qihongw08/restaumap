'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import type { RestaurantWithVisits } from '@/types/restaurant';
import { getRestaurantsAction } from '@/app/actions/restaurants';

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
      const res = await getRestaurantsAction({
        status: options?.status as any, // Cast to any because status enum might be strict
        excludeBlacklisted: options?.excludeBlacklisted,
      });

      if (res?.serverError || res?.validationErrors) {
        throw new Error(res?.serverError || 'Failed to fetch restaurants');
      }

      setRestaurants((res?.data?.data ?? []) as RestaurantWithVisits[]);
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
