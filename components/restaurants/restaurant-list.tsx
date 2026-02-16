"use client";

import { useState } from "react";
import { RestaurantCard } from "@/components/restaurants/restaurant-card";
import { RemoveRestaurantModal } from "@/components/restaurants/remove-restaurant-modal";
import { Loading } from "@/components/shared/loading";
import { useRestaurants } from "@/hooks/use-restaurants";

interface RestaurantListProps {
  status?: string;
  excludeBlacklisted?: boolean;
}

export function RestaurantList({
  status,
  excludeBlacklisted = true,
}: RestaurantListProps) {
  const { restaurants, isLoading, error, refetch } = useRestaurants({
    status,
    excludeBlacklisted,
  });
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
    if (res.ok) refetch();
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
        {restaurants.map((restaurant) => (
          <li key={restaurant.id}>
            <RestaurantCard
              restaurant={restaurant}
              onRemove={handleRemoveClick}
            />
          </li>
        ))}
      </ul>
      <RemoveRestaurantModal
        open={!!removeTarget}
        onClose={() => setRemoveTarget(null)}
        restaurantName={removeTarget?.name ?? ""}
        onConfirm={handleRemoveConfirm}
      />
    </>
  );
}
