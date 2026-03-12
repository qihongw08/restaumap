"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { RestaurantCard } from "@/components/restaurants/restaurant-card";
import { RemoveRestaurantModal } from "@/components/restaurants/remove-restaurant-modal";
import { Loading } from "@/components/shared/loading";
import { useRestaurants } from "@/hooks/use-restaurants";
import type { RestaurantWithVisits } from "@/types/restaurant";
import { Loader2 } from "lucide-react";

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

  // Pagination state for loading more
  const [extraRestaurants, setExtraRestaurants] = useState<RestaurantWithVisits[]>([]);
  const [cursor, setCursor] = useState<string | null>(initialCursor);
  const [loadingMore, setLoadingMore] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const restaurants = [...baseRestaurants, ...extraRestaurants];

  const loadMore = useCallback(async () => {
    if (!cursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const params = new URLSearchParams({ limit: "10", cursor });
      if (status) params.set("status", status);
      if (!excludeBlacklisted) params.set("excludeBlacklisted", "false");
      const res = await fetch(`/api/restaurants?${params}`);
      if (!res.ok) return;
      const json = await res.json();
      setExtraRestaurants((prev) => [...prev, ...(json.data ?? [])]);
      setCursor(json.nextCursor ?? null);
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
    const res = await fetch(`/api/restaurants/${removeTarget.id}`, {
      method: "DELETE",
    });
    if (res.ok) {
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
        {restaurants.map((restaurant, index) => (
          <li key={restaurant.id}>
            <RestaurantCard
              restaurant={restaurant}
              onRemove={handleRemoveClick}
              priority={index < 2}
            />
          </li>
        ))}
      </ul>

      {/* Infinite scroll sentinel */}
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
