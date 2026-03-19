"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/modal";
import { LogVisitModal } from "@/components/visits/log-visit-modal";
import { Search, Loader2, MapPin, Plus } from "lucide-react";
import { searchPlacesAction } from "@/app/actions/places";
import { getRestaurantsAction, createRestaurantAction } from "@/app/actions/restaurants";
import { extractRestaurantAction } from "@/app/actions/extract";

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
  mode = "logVisit",
}: {
  open: boolean;
  onClose: () => void;
  mode?: "logVisit" | "addOnly";
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
      if (mode === "addOnly") {
        let googleResults: SearchResult[] = [];
        try {
          const placesRes = await searchPlacesAction({ name: q, addressOrRegion: "" });
          if (!placesRes?.serverError) {
            googleResults = (placesRes?.data ?? []).map((p: any) => ({
              id: p.placeId,
              name: p.name,
              address: p.formattedAddress,
              source: "google" as const,
              latitude: p.latitude,
              longitude: p.longitude,
              googlePlaceId: p.placeId,
            }));
          }
        } catch {}
        setResults(googleResults);
        return;
      }

      const savedRes = await getRestaurantsAction({ limit: 5, cuisine: q });
      const saved: SearchResult[] = (savedRes?.data?.data ?? []).map((r: any) => ({
        id: r.id,
        name: r.name,
        address: r.formattedAddress,
        source: "saved" as const,
      }));

      const nameRes = await getRestaurantsAction({ limit: 10 });
      const nameMatched: SearchResult[] = (nameRes?.data?.data ?? [])
        .filter((r: { name: string }) => r.name.toLowerCase().includes(q.toLowerCase()))
        .map((r: any) => ({
          id: r.id,
          name: r.name,
          address: r.formattedAddress,
          source: "saved" as const,
        }));

      const savedMap = new Map<string, SearchResult>();
      for (const r of [...saved, ...nameMatched]) savedMap.set(r.id, r);
      const dedupedSaved = [...savedMap.values()];

      let googleResults: SearchResult[] = [];
      try {
        const placesRes = await searchPlacesAction({ name: q, addressOrRegion: "" });
        if (!placesRes?.serverError) {
          googleResults = (placesRes?.data ?? [])
            .filter((p: any) => !dedupedSaved.some((s) => s.googlePlaceId && s.googlePlaceId === p.placeId))
            .map((p: any) => ({
              id: p.placeId,
              name: p.name,
              address: p.formattedAddress,
              source: "google" as const,
              latitude: p.latitude,
              longitude: p.longitude,
              googlePlaceId: p.placeId,
            }));
        }
      } catch {}
      // Google search failed, continue with saved results only
      
      setResults([...dedupedSaved, ...googleResults]);
    } finally {
      setSearching(false);
    }
  }, [query, mode]);

  const handleSelectSaved = (restaurantId: string) => {
    if (mode === "addOnly") {
      onClose();
      router.push(`/restaurants/${restaurantId}`);
      router.refresh();
    } else {
      setSelectedRestaurantId(restaurantId);
    }
  };

  const handleSelectGoogle = async (result: SearchResult) => {
    if (!result.googlePlaceId) return;
    setSaving(true);
    try {
      const enrichRes = await extractRestaurantAction({
        name: result.name,
        addressOrRegion: result.address ?? "",
      });
      const enriched: any = enrichRes?.data ?? {};

      const createRes = await createRestaurantAction({
        name: result.name,
        formattedAddress: result.address,
        googlePlaceId: result.googlePlaceId,
        latitude: result.latitude ?? null,
        longitude: result.longitude ?? null,
        openingHoursWeekdayText: Array.isArray(enriched.openingHoursWeekdayText) ? enriched.openingHoursWeekdayText : [],
        cuisineTypes: Array.isArray(enriched.cuisineTypes) ? enriched.cuisineTypes : [],
        popularDishes: Array.isArray(enriched.popularDishes) ? enriched.popularDishes : [],
        priceRange: typeof enriched.priceRange === "string" ? enriched.priceRange : null,
        ambianceTags: Array.isArray(enriched.ambianceTags) ? enriched.ambianceTags : [],
        status: mode === "addOnly" ? "WANT_TO_GO" : "VISITED",
      });

      if (!createRes?.serverError && !createRes?.validationErrors) {
        if (mode === "addOnly") {
          onClose();
          // @ts-ignore
          router.push(`/restaurants/${createRes.data?.id}`);
          router.refresh();
        } else {
          // @ts-ignore
          setSelectedRestaurantId(createRes.data?.id);
        }
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

  // If a restaurant is selected and we're in logVisit mode, show the log visit modal
  if (mode === "logVisit" && selectedRestaurantId) {
    return (
      <LogVisitModal
        open
        onClose={handleLogVisitClose}
        restaurantId={selectedRestaurantId}
      />
    );
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={mode === "addOnly" ? "Add restaurant" : "Log a visit"}
    >
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
