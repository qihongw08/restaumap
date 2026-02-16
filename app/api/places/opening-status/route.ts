import { NextRequest, NextResponse } from 'next/server';
import { getPlaceOpeningHours } from '@/lib/places';

/**
 * GET ?placeIds=id1,id2
 * Returns current open_now and weekday_text for each place from Google Places.
 * Used by the map "Open Now" filter.
 */
export async function GET(request: NextRequest) {
  const placeIds = request.nextUrl.searchParams.get('placeIds')?.split(',').filter(Boolean) ?? [];
  if (placeIds.length === 0) {
    return NextResponse.json({ data: {} });
  }

  const results: Record<string, { openNow: boolean; weekdayText: string[] }> = {};
  await Promise.all(
    placeIds.map(async (placeId) => {
      try {
        const hours = await getPlaceOpeningHours(placeId);
        results[placeId] = { openNow: hours.openNow, weekdayText: hours.weekdayText };
      } catch {
        results[placeId] = { openNow: false, weekdayText: [] };
      }
    })
  );

  return NextResponse.json({ data: results });
}
