"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Header } from "@/components/shared/header";
import { Nav } from "@/components/shared/nav";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loading } from "@/components/shared/loading";
import { extractLinkAction } from "@/app/actions/extract";
import { searchPlacesAction } from "@/app/actions/places";
import { importRestaurantAction } from "@/app/actions/restaurants";

type Extracted = {
  name: string;
  address: string | null;
  formattedAddress?: string | null;
  openingHoursWeekdayText?: string[];
  cuisineTypes: string[];
  popularDishes: string[];
  priceRange: string | null;
  ambianceTags: string[];
};

type PlaceCandidate = {
  placeId: string;
  name: string;
  formattedAddress: string;
  latitude?: number | null;
  longitude?: number | null;
};

function isUrl(s: string): boolean {
  const t = s.trim();
  return t.startsWith("http://") || t.startsWith("https://");
}

function extractUrl(text: string): string | null {
  const trimmed = text.trim();
  if (!trimmed) return null;
  const match = trimmed.match(/https?:\/\/[^\s]+/);
  if (!match) return null;
  return match[0].replace(/[.,;:!?)]+$/, "");
}

type ImportContentProps = {
  variant?: "page" | "modal";
  onClose?: () => void;
};

export function ImportContent({
  variant = "page",
  onClose,
}: ImportContentProps) {
  const isModal = variant === "modal";
  const searchParams = useSearchParams();
  const [text, setText] = useState("");
  const [extracted, setExtracted] = useState<Extracted | null>(null);
  const [placesCandidates, setPlacesCandidates] = useState<
    PlaceCandidate[] | null
  >(null);
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isSearchingPlaces, setIsSearchingPlaces] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const urlFromShare =
    searchParams.get("url") ?? searchParams.get("text") ?? "";

  useEffect(() => {
    if (urlFromShare) setText(urlFromShare);
  }, [urlFromShare]);

  const handleExtract = async () => {
    if (!text.trim()) return;
    setIsExtracting(true);
    setError(null);
    setPlacesCandidates(null);
    setSelectedPlaceId(null);
    try {
      const urlOrText = extractUrl(text) ?? text.trim();
      const res = await extractLinkAction({ text: urlOrText });
      if (res?.serverError) throw new Error(res.serverError);
      
      const data = res?.data as Extracted;
      setExtracted(data);

      setIsSearchingPlaces(true);
      try {
        const searchRes = await searchPlacesAction({
          name: data.name,
          addressOrRegion: data.address ?? "",
        });
        if (!searchRes?.serverError) {
          const candidates = (searchRes?.data ?? []) as PlaceCandidate[];
          setPlacesCandidates(candidates);
          if (candidates.length === 1)
            setSelectedPlaceId(candidates[0].placeId);
          else setSelectedPlaceId(null);
        } else {
          setPlacesCandidates([]);
        }
      } catch {
        setPlacesCandidates([]);
      } finally {
        setIsSearchingPlaces(false);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not extract info");
      setExtracted(null);
    } finally {
      setIsExtracting(false);
    }
  };

  const handleSave = async () => {
    if (!extracted?.name) return;
    setIsSaving(true);
    setError(null);
    try {
      const sourceUrl =
        extractUrl(text) ?? (isUrl(text.trim()) ? text.trim() : null);
      const candidates = placesCandidates ?? [];
      const selectedCandidate =
        selectedPlaceId && candidates.length > 0
          ? (candidates.find((c) => c.placeId === selectedPlaceId) ??
            (candidates.length === 1 ? candidates[0] : null))
          : candidates.length === 1
          ? candidates[0]
          : null;

      if (!selectedCandidate) {
        setError("Please select a restaurant from the list before saving.");
        return;
      }
      if (selectedCandidate.latitude == null || selectedCandidate.longitude == null) {
        setError("Could not get coordinates for this restaurant.");
        return;
      }

      const res = await importRestaurantAction({
        sourceUrl,
        placeId: selectedCandidate.placeId,
        name: selectedCandidate.name,
        address: selectedCandidate.formattedAddress,
        formattedAddress: selectedCandidate.formattedAddress,
        latitude: selectedCandidate.latitude,
        longitude: selectedCandidate.longitude,
        openingHoursWeekdayText: extracted.openingHoursWeekdayText?.length
          ? extracted.openingHoursWeekdayText
          : ["Opening hours not available"],
        cuisineTypes: extracted.cuisineTypes ?? [],
        popularDishes: extracted.popularDishes ?? [],
        priceRange: extracted.priceRange,
        ambianceTags: extracted.ambianceTags ?? [],
      });
      if (res?.serverError || res?.validationErrors) throw new Error("Failed to save restaurant");
      setExtracted(null);
      setPlacesCandidates(null);
      setSelectedPlaceId(null);
      setText("");
      if (isModal) {
        onClose?.();
        window.location.reload();
      } else {
        window.location.href = "/restaurants";
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className={isModal ? "w-full" : "min-h-screen bg-background pb-20"}>
      {!isModal && <Header />}
      <main
        className={
          isModal
            ? "mx-auto max-w-lg max-h-[60vh] overflow-y-auto pr-1"
            : "mx-auto max-w-lg px-6 pt-40 pb-6"
        }
      >
        {!isModal && (
          <h1 className="mb-4 text-2xl font-black italic tracking-tighter text-foreground uppercase">
            Import restaurant
          </h1>
        )}
        <p className="mb-6 text-sm font-medium text-muted-foreground">
          Paste a link from Instagram, TikTok, or RedNote. We&apos;ll extract
          the restaurant name and details, then find it on Google to save the
          right place.
        </p>

        <Card className="border-2 border-primary/50 overflow-hidden shadow-md rounded-3xl">
          <CardContent className="p-6 space-y-4 bg-card">
            <textarea
              className="w-full rounded-2xl border-2 border-muted bg-background px-4 py-3 text-foreground placeholder-muted-foreground focus:border-primary focus:outline-none focus:ring-0 transition-all font-medium"
              rows={4}
              placeholder="Paste URL..."
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
            <Button
              onClick={handleExtract}
              disabled={!text.trim() || isExtracting}
              className="w-full py-6 rounded-2xl text-sm font-black uppercase tracking-widest shadow-lg active:scale-95 transition-transform"
            >
              {isExtracting ? "Extracting…" : "Extract info"}
            </Button>
          </CardContent>
        </Card>

        {error && (
          <div className="mt-6 rounded-2xl border-2 border-destructive/20 bg-destructive/10 p-4 text-sm font-bold text-destructive text-center">
            {error}
          </div>
        )}

        {isExtracting && <Loading />}

        {extracted && !isExtracting && (
          <>
            <Card className="mt-8 border-2 border-primary/20 shadow-2xl overflow-hidden rounded-3xl">
              <CardContent className="p-6 space-y-6 bg-card">
                <h2 className="text-xl font-black italic tracking-tighter text-foreground">
                  Extracted Info
                </h2>
                <dl className="space-y-4">
                  {[
                    { label: "Name", value: extracted.name },
                    { label: "Address", value: extracted.address },
                    {
                      label: "Cuisine",
                      value: extracted.cuisineTypes?.join(", "),
                    },
                    {
                      label: "Dishes",
                      value: extracted.popularDishes?.join(", "),
                    },
                    { label: "Price", value: extracted.priceRange },
                    {
                      label: "Ambiance",
                      value: extracted.ambianceTags?.join(", "),
                    },
                  ].map((item) => (
                    <div key={item.label} className="flex flex-col gap-1">
                      <dt className="text-[10px] font-black uppercase tracking-widest text-primary">
                        {item.label}
                      </dt>
                      <dd className="text-sm font-bold text-foreground">
                        {item.value || "—"}
                      </dd>
                    </div>
                  ))}
                </dl>
              </CardContent>
            </Card>

            {isSearchingPlaces && (
              <p className="mt-4 text-center text-sm text-muted-foreground">
                Finding on Google Places…
              </p>
            )}

            {!isSearchingPlaces &&
              placesCandidates &&
              placesCandidates.length > 1 && (
                <Card className="mt-6 border-2 border-primary/20 shadow-xl rounded-3xl overflow-hidden">
                  <CardContent className="p-6 bg-card">
                    <h3 className="text-sm font-black uppercase tracking-widest text-primary mb-4">
                      Choose the restaurant
                    </h3>
                    <ul className="space-y-3">
                      {placesCandidates.map((c) => (
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

            {!isSearchingPlaces && placesCandidates?.length === 1 && (
              <p className="mt-4 text-sm text-muted-foreground text-center">
                We found one match:{" "}
                <strong className="text-foreground">
                  {placesCandidates[0].name}
                </strong>
                . Save to use its details and photo.
              </p>
            )}

            {!isSearchingPlaces && extracted && (
              <div className="mt-6">
                <Button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="w-full mb-4 py-4 rounded-2xl text-sm font-black uppercase tracking-widest shadow-lg active:scale-95 transition-transform bg-primary text-primary-foreground"
                >
                  {isSaving ? "Saving…" : "Save restaurant"}
                </Button>
              </div>
            )}
          </>
        )}
      </main>
      {!isModal && <Nav />}
    </div>
  );
}
