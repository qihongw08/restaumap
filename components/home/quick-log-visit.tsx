"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/modal";
import { LogVisitModal } from "@/components/visits/log-visit-modal";
import { Search, Loader2, MapPin, Plus } from "lucide-react";

interface SearchResult {
  id: string;
  name: string;
  address?: string;
  source: "saved" | "google";
  googlePlaceId?: string;
  latitude?: number | null;
  longitude?: number | null;
}

export function QuickLogVisit({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<
    string | null
  >(null);

  const handleSearch = useCallback(async () => {
    const q = query.trim();
    if (!q) return;
    setSearching(true);
    setResults([]);

    try {
      // Search saved restaurants first
      const savedRes = await fetch(
        `/api/restaurants?limit=5&cuisine=${encodeURIComponent(q)}`,
      );
      const savedJson = await savedRes.json();
      const saved: SearchResult[] = (savedJson.data ?? []).map(
        (r: { id: string; name: string; formattedAddress?: string }) => ({
          id: r.id,
          name: r.name,
          address: r.formattedAddress,
          source: "saved" as const,
        }),
      );

      // Also search by name match in saved restaurants
      const nameRes = await fetch(`/api/restaurants?limit=10`);
      const nameJson = await nameRes.json();
      const nameMatched: SearchResult[] = (nameJson.data ?? [])
        .filter((r: { name: string }) =>
          r.name.toLowerCase().includes(q.toLowerCase()),
        )
        .map((r: { id: string; name: string; formattedAddress?: string }) => ({
          id: r.id,
          name: r.name,
          address: r.formattedAddress,
          source: "saved" as const,
        }));

      // Deduplicate saved results
      const savedMap = new Map<string, SearchResult>();
      for (const r of [...saved, ...nameMatched]) {
        savedMap.set(r.id, r);
      }
      const dedupedSaved = [...savedMap.values()];

      // Search Google Places for new restaurants
      let googleResults: SearchResult[] = [];
      try {
        const placesRes = await fetch("/api/places/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: q }),
        });
        if (placesRes.ok) {
          const placesJson = await placesRes.json();
          googleResults = (placesJson.data ?? [])
            .filter(
              (p: { placeId?: string }) =>
                !dedupedSaved.some(
                  (s) => s.googlePlaceId && s.googlePlaceId === p.placeId,
                ),
            )
            .map(
              (p: {
                placeId: string;
                name: string;
                formattedAddress?: string;
                latitude?: number | null;
                longitude?: number | null;
              }) => ({
                id: p.placeId,
                name: p.name,
                address: p.formattedAddress,
                source: "google" as const,
                latitude: p.latitude,
                longitude: p.longitude,
                googlePlaceId: p.placeId,
              }),
            );
        }
      } catch {
        // Google search failed, continue with saved results only
      }

      setResults([...dedupedSaved, ...googleResults]);
    } finally {
      setSearching(false);
    }
  }, [query]);

  const handleSelectSaved = (restaurantId: string) => {
    setSelectedRestaurantId(restaurantId);
  };

  const handleSelectGoogle = async (result: SearchResult) => {
    if (!result.googlePlaceId) return;
    setSaving(true);
    try {
      // Enrich via AI then create
      const enrichRes = await fetch("/api/extract-restaurant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: result.name,
          address: result.address ?? "",
        }),
      });
      const enrichJson = enrichRes.ok ? await enrichRes.json() : { data: {} };
      const enriched = enrichJson.data ?? {};

      // Create restaurant
      const createRes = await fetch("/api/restaurants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: result.name,
          formattedAddress: result.address,
          googlePlaceId: result.googlePlaceId,
          latitude: result.latitude ?? null,
          longitude: result.longitude ?? null,
          openingHoursWeekdayText: enriched.openingHoursWeekdayText ?? [],
          cuisineTypes: enriched.cuisineTypes ?? [],
          popularDishes: enriched.popularDishes ?? [],
          priceRange: enriched.priceRange ?? null,
          ambianceTags: enriched.ambianceTags ?? [],
          status: "VISITED",
        }),
      });

      if (createRes.ok) {
        const createJson = await createRes.json();
        setSelectedRestaurantId(createJson.data.id);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleLogVisitClose = () => {
    setSelectedRestaurantId(null);
    setQuery("");
    setResults([]);
    onClose();
    router.refresh();
  };

  // If a restaurant is selected, show the log visit modal
  if (selectedRestaurantId) {
    return (
      <LogVisitModal
        open
        onClose={handleLogVisitClose}
        restaurantId={selectedRestaurantId}
      />
    );
  }

  return (
    <Modal open={open} onClose={onClose} title="Log a visit">
      <div className="space-y-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSearch();
          }}
          className="flex gap-2"
        >
          <div className="relative min-w-0 flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search restaurant name..."
              className="w-full rounded-xl border-2 border-border bg-background py-2.5 pl-10 pr-4 text-sm font-medium text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              autoFocus
            />
          </div>
          <button
            type="submit"
            disabled={!query.trim() || searching}
            className="shrink-0 rounded-xl bg-primary px-4 py-2.5 text-xs font-black uppercase tracking-widest text-primary-foreground shadow-sm disabled:opacity-50"
          >
            {searching ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Search"
            )}
          </button>
        </form>

        {saving && (
          <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Saving restaurant...
          </div>
        )}

        {results.length > 0 && !saving && (
          <ul className="max-h-[50vh] space-y-1.5 overflow-y-auto">
            {results.map((r) => (
              <li key={`${r.source}-${r.id}`}>
                <button
                  type="button"
                  onClick={() =>
                    r.source === "saved"
                      ? handleSelectSaved(r.id)
                      : handleSelectGoogle(r)
                  }
                  className="flex w-full items-center gap-3 rounded-xl border border-black/10 bg-white p-3 text-left shadow-sm transition-all hover:border-primary/30 hover:shadow-md active:scale-[0.99]"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                    {r.source === "saved" ? (
                      <MapPin className="h-4 w-4 text-primary" />
                    ) : (
                      <Plus className="h-4 w-4 text-blue-500" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-foreground break-words line-clamp-1">
                      {r.name}
                    </p>
                    {r.address && (
                      <p className="text-[10px] text-muted-foreground line-clamp-1">
                        {r.address}
                      </p>
                    )}
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[8px] font-black uppercase tracking-widest ${
                      r.source === "saved"
                        ? "bg-primary/10 text-primary"
                        : "bg-blue-500/10 text-blue-600"
                    }`}
                  >
                    {r.source === "saved" ? "Saved" : "New"}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}

        {!searching && results.length === 0 && query.trim() && (
          <p className="py-4 text-center text-sm text-muted-foreground">
            Type a restaurant name and hit Search
          </p>
        )}
      </div>
    </Modal>
  );
}
