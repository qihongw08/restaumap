"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { searchPlacesAction } from "@/app/actions/places";
import { extractRestaurantAction } from "@/app/actions/extract";
import { createRestaurantAction } from "@/app/actions/restaurants";

type PlaceCandidate = {
  placeId: string;
  name: string;
  formattedAddress: string;
  latitude?: number | null;
  longitude?: number | null;
};

type GroqExtracted = {
  openingHoursWeekdayText?: string[];
  cuisineTypes?: string[];
  popularDishes?: string[];
  priceRange?: string | null;
  ambianceTags?: string[];
};

export function NewRestaurantContent() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [candidates, setCandidates] = useState<PlaceCandidate[]>([]);
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setHasSearched(true);
    setIsSearching(true);
    setError(null);
    setCandidates([]);
    setSelectedPlaceId(null);
    try {
      const res = await searchPlacesAction({
        name: query.trim(),
        addressOrRegion: "",
      });
      if (res?.serverError) throw new Error(res.serverError);
      
      const next = (res?.data ?? []) as PlaceCandidate[];
      setCandidates(next);
      if (next.length === 1) setSelectedPlaceId(next[0].placeId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not search places");
      setCandidates([]);
      setSelectedPlaceId(null);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSave = async () => {
    const selected =
      candidates.find((c) => c.placeId === selectedPlaceId) ??
      (candidates.length === 1 ? candidates[0] : null);
    if (!selected) return;
    setIsSaving(true);
    setError(null);
    try {
      const enrichRes = await extractRestaurantAction({
        name: selected.name,
        addressOrRegion: selected.formattedAddress ?? "",
      });
      if (enrichRes?.serverError) {
        throw new Error("Could not enrich restaurant details");
      }
      
      const extracted = (enrichRes?.data ?? {}) as GroqExtracted;

      const res = await createRestaurantAction({
        name: selected.name,
        address: selected.formattedAddress,
        formattedAddress: selected.formattedAddress,
        latitude: selected.latitude ?? null,
        longitude: selected.longitude ?? null,
        googlePlaceId: selected.placeId,
        openingHoursWeekdayText: Array.isArray(extracted.openingHoursWeekdayText)
          ? extracted.openingHoursWeekdayText
          : [],
        cuisineTypes: Array.isArray(extracted.cuisineTypes)
          ? extracted.cuisineTypes
          : [],
        popularDishes: Array.isArray(extracted.popularDishes)
          ? extracted.popularDishes
          : [],
        priceRange:
          typeof extracted.priceRange === "string" || extracted.priceRange === null
            ? extracted.priceRange
            : null,
        ambianceTags: Array.isArray(extracted.ambianceTags)
          ? extracted.ambianceTags
          : [],
      });

      if (res?.serverError || res?.validationErrors) throw new Error("Failed to save restaurant");
      
      // @ts-ignore
      router.push(`/restaurants/${res.data?.id}`);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="border-2 border-primary/20 shadow-xl overflow-hidden rounded-3xl">
        <CardContent className="p-6 space-y-4 bg-card">
          <textarea
            className="w-full rounded-2xl border-2 border-muted bg-background px-4 py-3 text-foreground placeholder-muted-foreground focus:border-primary focus:outline-none focus:ring-0 transition-all font-medium"
            rows={3}
            placeholder="Type a restaurant name..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <Button
            onClick={handleSearch}
            disabled={!query.trim() || isSearching}
            className="w-full py-6 rounded-2xl text-sm font-black uppercase tracking-widest shadow-lg active:scale-95 transition-transform"
          >
            {isSearching ? "Searching…" : "Search on Google"}
          </Button>
        </CardContent>
      </Card>

      {error && (
        <div className="rounded-2xl border-2 border-destructive/20 bg-destructive/10 p-4 text-sm font-bold text-destructive text-center">
          {error}
        </div>
      )}

      {hasSearched && !isSearching && candidates.length > 1 && (
        <Card className="border-2 border-primary/20 shadow-xl rounded-3xl overflow-hidden">
          <CardContent className="p-6 bg-card">
            <h3 className="text-sm font-black uppercase tracking-widest text-primary mb-4">
              Choose the restaurant
            </h3>
            <ul className="space-y-3">
              {candidates.map((c) => (
                <li key={c.placeId}>
                  <button
                    type="button"
                    onClick={() => setSelectedPlaceId(c.placeId)}
                    className={`w-full text-left rounded-2xl border-2 p-4 transition-all flex gap-3 items-center ${
                      selectedPlaceId === c.placeId
                        ? "border-primary bg-primary/10"
                        : "border-muted hover:border-primary/40"
                    }`}
                  >
                    {/* Google photo preview removed */}
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-foreground truncate">
                        {c.name}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {c.formattedAddress}
                      </p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {hasSearched && !isSearching && candidates.length === 1 && (
        <p className="text-center text-sm text-muted-foreground">
          We found one match:{" "}
          <strong className="text-foreground">{candidates[0].name}</strong>
        </p>
      )}

      {hasSearched && !isSearching && candidates.length === 0 && (
        <p className="text-center text-sm text-muted-foreground">
          No matches found. Try adding a city or neighborhood in your query.
        </p>
      )}

      {hasSearched && !isSearching && candidates.length > 0 && (
        <Button
          onClick={handleSave}
          disabled={isSaving || (candidates.length > 1 && !selectedPlaceId)}
          className="w-full py-4 rounded-2xl text-sm font-black uppercase tracking-widest shadow-lg active:scale-95 transition-transform bg-primary text-primary-foreground"
        >
          {isSaving ? "Saving…" : "Save restaurant"}
        </Button>
      )}
    </div>
  );
}
