/**
 * Google Places API (legacy): text search, place details, and photo URL.
 * Uses GOOGLE_MAPS_API_KEY. Enable Places API in Google Cloud Console.
 */

const BASE = 'https://maps.googleapis.com/maps/api';

function getKey(): string {
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) throw new Error('GOOGLE_MAPS_API_KEY is not set');
  return key;
}

export interface PlaceCandidate {
  placeId: string;
  name: string;
  formattedAddress: string;
  photoReference: string | null;
}

/**
 * Text search for places by query (e.g. "Restaurant Name, City").
 * Returns up to 5 candidates with place_id, name, address, and first photo reference.
 */
export async function searchPlaces(
  query: string
): Promise<PlaceCandidate[]> {
  const key = getKey();
  const url = new URL(`${BASE}/place/textsearch/json`);
  url.searchParams.set('query', query);
  url.searchParams.set('key', key);

  const res = await fetch(url.toString());
  const data = (await res.json()) as {
    status: string;
    error_message?: string;
    results?: Array<{
      place_id: string;
      name: string;
      formatted_address: string;
      photos?: Array<{ photo_reference: string }>;
    }>;
  };

  if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
    const msg = data.error_message ?? data.status;
    throw new Error(
      `Places search failed: ${data.status}. ${msg}. Enable "Places API" in Google Cloud Console (APIs & Services) and allow this key to use it.`
    );
  }

  const results = data.results ?? [];
  return results.slice(0, 5).map((r) => ({
    placeId: r.place_id,
    name: r.name,
    formattedAddress: r.formatted_address,
    photoReference: r.photos?.[0]?.photo_reference ?? null,
  }));
}

const MAX_PLACE_PHOTOS = 5;

export interface PlaceDetailsResult {
  placeId: string;
  name: string;
  formattedAddress: string | null;
  latitude: number | null;
  longitude: number | null;
  photoReference: string | null;
  photoReferences: string[]; // Up to 5 photo references (use with /api/places/photo)
  openingHoursWeekdayText: string[]; // e.g. ["Monday: 9:00 AM – 5:00 PM", ...]
}

export interface PlaceOpeningHoursResult {
  openNow: boolean;
  weekdayText: string[];
}

/**
 * Get place details by place_id. Returns name, address, lat/lng, and up to 5 photo references.
 */
export async function getPlaceDetails(
  placeId: string
): Promise<PlaceDetailsResult> {
  const key = getKey();
  const fields = [
    'place_id',
    'name',
    'formatted_address',
    'geometry',
    'photos',
    'opening_hours',
  ].join(',');
  const url = new URL(`${BASE}/place/details/json`);
  url.searchParams.set('place_id', placeId);
  url.searchParams.set('fields', fields);
  url.searchParams.set('key', key);

  const res = await fetch(url.toString());
  const data = (await res.json()) as {
    status: string;
    result?: {
      place_id: string;
      name?: string;
      formatted_address?: string;
      geometry?: { location?: { lat: number; lng: number } };
      photos?: Array<{ photo_reference: string }>;
      opening_hours?: { weekday_text?: string[] };
    };
  };

  if (data.status !== 'OK' || !data.result) {
    throw new Error(`Place details failed: ${data.status}`);
  }

  const r = data.result;
  const refs = (r.photos ?? []).slice(0, MAX_PLACE_PHOTOS).map((p) => p.photo_reference);
  const photoRef = refs[0] ?? null;
  const openingHoursWeekdayText = r.opening_hours?.weekday_text ?? [];

  return {
    placeId: r.place_id,
    name: r.name ?? '',
    formattedAddress: r.formatted_address ?? null,
    latitude: r.geometry?.location?.lat ?? null,
    longitude: r.geometry?.location?.lng ?? null,
    photoReference: photoRef,
    photoReferences: refs,
    openingHoursWeekdayText,
  };
}

/**
 * Fetch only opening hours for a place (for "Open Now" filter).
 * Uses minimal fields to reduce quota.
 */
export async function getPlaceOpeningHours(
  placeId: string
): Promise<PlaceOpeningHoursResult> {
  const key = getKey();
  const url = new URL(`${BASE}/place/details/json`);
  url.searchParams.set('place_id', placeId);
  url.searchParams.set('fields', 'opening_hours');
  url.searchParams.set('key', key);

  const res = await fetch(url.toString());
  const data = (await res.json()) as {
    status: string;
    result?: {
      opening_hours?: {
        open_now?: boolean;
        weekday_text?: string[];
      };
    };
  };

  if (data.status !== 'OK' || !data.result) {
    return { openNow: false, weekdayText: [] };
  }

  const oh = data.result.opening_hours;
  return {
    openNow: oh?.open_now ?? false,
    weekdayText: oh?.weekday_text ?? [],
  };
}

/**
 * Build a photo URL for a stored photo_reference (e.g. for API proxy use).
 */
export function buildPlacePhotoUrl(photoReference: string): string {
  const key = getKey();
  return `${BASE}/place/photo?maxwidth=800&photo_reference=${encodeURIComponent(photoReference)}&key=${key}`;
}
