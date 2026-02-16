export interface GeocodeResult {
  latitude: number;
  longitude: number;
  formattedAddress: string;
}

/**
 * Geocode an address using Google Geocoding API (server-side).
 * Set GOOGLE_MAPS_API_KEY in .env for server use.
 */
export async function geocodeAddress(
  address: string
): Promise<GeocodeResult | null> {
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) return null;

  const url = new URL('https://maps.googleapis.com/maps/api/geocode/json');
  url.searchParams.set('address', address);
  url.searchParams.set('key', key);

  const res = await fetch(url.toString());
  const data = (await res.json()) as {
    status: string;
    results?: Array<{
      geometry: { location: { lat: number; lng: number } };
      formatted_address: string;
    }>;
  };

  if (data.status !== 'OK' || !data.results?.[0]) return null;

  const r = data.results[0];
  return {
    latitude: r.geometry.location.lat,
    longitude: r.geometry.location.lng,
    formattedAddress: r.formatted_address,
  };
}
