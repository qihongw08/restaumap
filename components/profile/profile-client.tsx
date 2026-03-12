"use client";

import { useState, useCallback } from "react";
import { VisitLogCard, type VisitLogData } from "@/components/visits/visit-log-card";
import { Loader2 } from "lucide-react";

interface ProfileClientProps {
  visits: VisitLogData[];
  initialCursor?: string | null;
}

export function ProfileClient({ visits: initialVisits, initialCursor = null }: ProfileClientProps) {
  const [view, setView] = useState<"timeline" | "by-restaurant">("timeline");
  const [visits, setVisits] = useState(initialVisits);
  const [cursor, setCursor] = useState<string | null>(initialCursor);
  const [loadingMore, setLoadingMore] = useState(false);

  const loadMore = useCallback(async () => {
    if (!cursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const res = await fetch(`/api/visits?limit=10&cursor=${cursor}`);
      if (!res.ok) return;
      const json = await res.json();
      setVisits((prev) => [...prev, ...(json.data ?? [])]);
      setCursor(json.nextCursor ?? null);
    } finally {
      setLoadingMore(false);
    }
  }, [cursor, loadingMore]);

  if (visits.length === 0) {
    return (
      <div className="rounded-2xl border border-black/10 bg-white px-10 py-12 text-center shadow-sm">
        <p className="text-sm font-bold text-muted-foreground">No visits yet</p>
        <p className="mt-2 text-xs text-muted-foreground">
          Log a visit to start building your food journal.
        </p>
      </div>
    );
  }

  // Group visits by restaurant for "by-restaurant" view
  const byRestaurant = visits.reduce<
    Record<string, { name: string; id: string; visits: VisitLogData[] }>
  >((acc, v) => {
    if (!acc[v.restaurantId]) {
      acc[v.restaurantId] = {
        name: v.restaurant.name,
        id: v.restaurant.id,
        visits: [],
      };
    }
    acc[v.restaurantId].visits.push(v);
    return acc;
  }, {});

  const restaurantGroups = Object.values(byRestaurant).sort(
    (a, b) => b.visits.length - a.visits.length,
  );

  return (
    <>
      <div className="mb-4 flex rounded-xl bg-muted/40 p-1">
        <button
          type="button"
          onClick={() => setView("timeline")}
          className={`flex-1 rounded-lg py-2.5 text-sm font-black uppercase tracking-widest transition-colors ${
            view === "timeline"
              ? "bg-white text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Timeline
        </button>
        <button
          type="button"
          onClick={() => setView("by-restaurant")}
          className={`flex-1 rounded-lg py-2.5 text-sm font-black uppercase tracking-widest transition-colors ${
            view === "by-restaurant"
              ? "bg-white text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          By Restaurant
        </button>
      </div>

      {view === "timeline" ? (
        <ul className="space-y-4">
          {visits.map((v) => (
            <li key={v.id}>
              <VisitLogCard visit={v} editable />
            </li>
          ))}
        </ul>
      ) : (
        <div className="space-y-8">
          {restaurantGroups.map((group) => (
            <section key={group.id}>
              <h3 className="mb-3 text-lg font-black italic tracking-tighter text-foreground uppercase break-words">
                {group.name}
                <span className="ml-2 text-sm font-bold normal-case text-muted-foreground">
                  {group.visits.length} visit{group.visits.length !== 1 ? "s" : ""}
                </span>
              </h3>
              <ul className="space-y-4">
                {group.visits.map((v) => (
                  <li key={v.id}>
                    <VisitLogCard
                      visit={v}
                      editable
                      showRestaurantName={false}
                    />
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      {/* Load more */}
      {cursor && (
        <div className="mt-6 flex justify-center">
          <button
            type="button"
            onClick={loadMore}
            disabled={loadingMore}
            className="flex items-center gap-2 rounded-full border border-black/10 bg-white px-6 py-3 text-xs font-black uppercase tracking-widest text-foreground shadow-sm transition-colors hover:bg-muted/30 disabled:opacity-50"
          >
            {loadingMore ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Load more"
            )}
          </button>
        </div>
      )}
    </>
  );
}
