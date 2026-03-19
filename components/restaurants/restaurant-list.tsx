"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { RestaurantCard } from "@/components/restaurants/restaurant-card";
import { RemoveRestaurantModal } from "@/components/restaurants/remove-restaurant-modal";
import { Loading } from "@/components/shared/loading";
import { useRestaurants } from "@/hooks/use-restaurants";
import type { RestaurantWithVisits } from "@/types/restaurant";
import { Loader2 } from "lucide-react";
import { useLocation } from "@/hooks/use-location";
import { deleteRestaurantAction, getRestaurantsAction } from "@/app/actions/restaurants";

interface RestaurantListProps {
  status?: string;
  excludeBlacklisted?: boolean;
  initialRestaurants?: RestaurantWithVisits[];
  initialCursor?: string | null;
}

export function RestaurantList({
  status,
  excludeBlacklisted = true,
  initialRestaurants,
  initialCursor = null,
}: RestaurantListProps) {
  const { restaurants: baseRestaurants, isLoading, error, refetch } = useRestaurants({
    status,
    excludeBlacklisted,
    initialData: initialRestaurants,
  });

  const [extraRestaurants, setExtraRestaurants] = useState<RestaurantWithVisits[]>([]);
  const [cursor, setCursor] = useState<string | null>(initialCursor);
  const [loadingMore, setLoadingMore] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const restaurants = useMemo(
    () => [...baseRestaurants, ...extraRestaurants],
    [baseRestaurants, extraRestaurants],
  );

  const { coords, getLocation } = useLocation();

  useEffect(() => {
    getLocation();
  }, [getLocation]);

  function calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ) {
    const R = 3958.8;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  const sortedRestaurants = useMemo(() => {
    type WithDistance = RestaurantWithVisits & { distance: number | null };
    const withDetails: WithDistance[] = restaurants.map((r) => {
      let distance: number | null = null;
      if (coords && r.latitude != null && r.longitude != null) {
        distance = calculateDistance(
          coords.latitude,
          coords.longitude,
          r.latitude,
          r.longitude,
        );
      }
      return { ...(r as RestaurantWithVisits), distance };
    });

    withDetails.sort((a, b) => {
      const aVisited = a.status === "VISITED" ? 1 : 0;
      const bVisited = b.status === "VISITED" ? 1 : 0;
      if (aVisited !== bVisited) return aVisited - bVisited;
      return (a.distance ?? Infinity) - (b.distance ?? Infinity);
    });

    return withDetails;
  }, [restaurants, coords]);

  const loadMore = useCallback(async () => {
    if (!cursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const res = await getRestaurantsAction({
        limit: 10,
        cursor,
        status: (status as any) || undefined,
        excludeBlacklisted: excludeBlacklisted === false ? false : undefined,
      });
      if (res?.serverError || res?.validationErrors || !res?.data) return;
      if (res.data) {
        setExtraRestaurants((prev) => [...prev, ...(res.data!.data ?? [])]);
        setCursor(res.data.nextCursor ?? null);
      }
    } finally {
      setLoadingMore(false);
    }
  }, [cursor, loadingMore, status, excludeBlacklisted]);

  // IntersectionObserver for infinite scroll
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !cursor) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) loadMore();
      },
      { rootMargin: "200px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [cursor, loadMore]);

  const [removeTarget, setRemoveTarget] = useState<{
    id: string;
    name: string;
  } | null>(null);

  const handleRemoveClick = (id: string, name: string) => {
    setRemoveTarget({ id, name });
  };

  const handleRemoveConfirm = async () => {
    if (!removeTarget) return;
    const res = await deleteRestaurantAction({ id: removeTarget.id });
    if (!res?.serverError && !res?.validationErrors) {
      setExtraRestaurants((prev) => prev.filter((r) => r.id !== removeTarget.id));
      refetch();
    }
  };

  if (isLoading) return <Loading />;
  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
        <p>{error}</p>
        <button
          type="button"
          onClick={() => refetch()}
          className="mt-2 text-sm font-medium underline"
        >
          Retry
        </button>
      </div>
    );
  }
  if (restaurants.length === 0) {
    return (
      <div className="rounded-2xl border-2 border-muted bg-muted/30 px-10 py-12 text-center text-muted-foreground">
        <p className="font-bold text-foreground">No restaurants yet.</p>
        <p className="mt-2 text-sm">
          Add one via{" "}
          <a href="/import" className="text-primary underline font-bold">
            Import
          </a>
          .
        </p>
      </div>
    );
  }

  return (
    <>
      <ul className="space-y-3">
        {sortedRestaurants.map((restaurant) => (
          <li key={restaurant.id}>
            <RestaurantCard
              restaurant={restaurant}
              onRemove={handleRemoveClick}
            />
          </li>
        ))}
      </ul>

      {cursor && (
        <div ref={sentinelRef} className="flex justify-center py-6">
          {loadingMore && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
        </div>
      )}

      <RemoveRestaurantModal
        open={!!removeTarget}
        onClose={() => setRemoveTarget(null)}
        restaurantName={removeTarget?.name ?? ""}
        onConfirm={handleRemoveConfirm}
      />
    </>
  );
}
