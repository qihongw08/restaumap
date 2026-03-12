/**
 * Google Places API (New): text search, place details, opening hours, and photo URL.
 * Uses GOOGLE_MAPS_API_KEY. Enable Places API in Google Cloud Console.
 */

function getKey(): string {
  const key =
    process.env.GOOGLE_MAPS_API_KEY ??
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!key)
    throw new Error(
      "GOOGLE_MAPS_API_KEY or NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is not set",
    );
  return key;
}

export interface PlaceCandidate {
  placeId: string;
  name: string;
  formattedAddress: string;
  latitude: number | null;
  longitude: number | null;
}

/**
 * Text search for places by query (e.g. "Restaurant Name, City").
 * Returns up to 5 candidates with place_id, name, address, and first photo reference.
 */
export async function searchPlaces(query: string): Promise<PlaceCandidate[]> {
  const key = getKey();
  const endpoint = "https://places.googleapis.com/v1/places:searchText";

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": key,
      "X-Goog-FieldMask":
        "places.id,places.displayName,places.formattedAddress,places.location",
    },
    body: JSON.stringify({ textQuery: query }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `Places search failed: ${res.status} ${res.statusText}${text ? ` - ${text}` : ""}`,
    );
  }

  const data = (await res.json()) as {
    places?: Array<{
      id: string;
      displayName?: { text?: string };
      formattedAddress?: string;
      location?: { latitude?: number; longitude?: number };
      photos?: Array<{
        name: string;
        widthPx?: number;
        heightPx?: number;
        googleMapsUri?: string;
      }>;
    }>;
  };

  const places = data.places ?? [];
  return places.slice(0, 5).map((p) => ({
    placeId: p.id,
    name: p.displayName?.text ?? "",
    formattedAddress: p.formattedAddress ?? "",
    latitude: p.location?.latitude ?? null,
    longitude: p.location?.longitude ?? null,
  }));
}

export interface PlaceDetailsResult {
  placeId: string;
  name: string;
  formattedAddress: string | null;
  latitude: number | null;
  longitude: number | null;
  openingHoursWeekdayText: string[]; // e.g. ["Monday: 9:00 AM – 5:00 PM", ...]
}

/**
 * Get place details by place ID (Places API v1).
 * Returns name, address, lat/lng, and weekday opening hours.
 */
export async function getPlaceDetails(
  placeId: string,
): Promise<PlaceDetailsResult> {
  const key = getKey();
  const endpoint = `https://places.googleapis.com/v1/places/${encodeURIComponent(
    placeId,
  )}`;

  const res = await fetch(endpoint, {
    method: "GET",
    headers: {
      "X-Goog-Api-Key": key,
      "X-Goog-FieldMask":
        "id,displayName,formattedAddress,location,regularOpeningHours.weekdayDescriptions",
    },
  });

  const data = (await res.json()) as {
    id?: string;
    displayName?: { text?: string };
    formattedAddress?: string;
    location?: { latitude?: number; longitude?: number };
    regularOpeningHours?: { weekdayDescriptions?: string[] };
  };

  if (!res.ok || !data) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `Place details failed: ${res.status} ${res.statusText}${
        text ? ` - ${text}` : ""
      }`,
    );
  }

  const openingHoursWeekdayText =
    data.regularOpeningHours?.weekdayDescriptions ?? [];

  return {
    placeId: data.id ?? placeId,
    name: data.displayName?.text ?? "",
    formattedAddress: data.formattedAddress ?? null,
    latitude: data.location?.latitude ?? null,
    longitude: data.location?.longitude ?? null,
    openingHoursWeekdayText,
  };
}
