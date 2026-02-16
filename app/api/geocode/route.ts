import { NextRequest, NextResponse } from 'next/server';
import { geocodeAddress } from '@/lib/maps';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const address = body.address ?? body.query ?? '';

    if (!address || typeof address !== 'string') {
      return NextResponse.json(
        { error: 'Missing address or query in body' },
        { status: 400 }
      );
    }

    const result = await geocodeAddress(address);
    if (!result) {
      return NextResponse.json(
        { error: 'Geocoding failed or no results' },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: result });
  } catch (error) {
    console.error('Geocode error:', error);
    return NextResponse.json(
      { error: 'Failed to geocode address' },
      { status: 500 }
    );
  }
}
