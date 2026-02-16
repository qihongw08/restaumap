import { NextRequest, NextResponse } from 'next/server';
import { buildPlacePhotoUrl } from '@/lib/places';

/**
 * Proxy for Place photo so we don't expose GOOGLE_MAPS_API_KEY to the client.
 * Use as: <img src="/api/places/photo?reference=..." />
 */
export async function GET(request: NextRequest) {
  const reference = request.nextUrl.searchParams.get('reference');
  if (!reference) {
    return NextResponse.json({ error: 'Missing reference' }, { status: 400 });
  }
  try {
    const url = buildPlacePhotoUrl(reference);
    const res = await fetch(url, { redirect: 'follow' });
    if (!res.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch photo' },
        { status: 502 }
      );
    }
    const contentType = res.headers.get('content-type') ?? 'image/jpeg';
    const buffer = await res.arrayBuffer();
    return new NextResponse(buffer, {
      headers: { 'Content-Type': contentType, 'Cache-Control': 'public, max-age=86400' },
    });
  } catch (error) {
    console.error('Place photo proxy error:', error);
    return NextResponse.json(
      { error: 'Failed to load photo' },
      { status: 500 }
    );
  }
}
