import { NextRequest, NextResponse } from 'next/server';
import { searchPlaces } from '@/lib/places';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const name = body.name ?? '';
    const addressOrRegion = body.addressOrRegion ?? '';
    const query = [name, addressOrRegion].filter(Boolean).join(', ');
    if (!query.trim()) {
      return NextResponse.json(
        { error: 'Missing name or addressOrRegion' },
        { status: 400 }
      );
    }

    const candidates = await searchPlaces(query);
    return NextResponse.json({ data: candidates });
  } catch (error) {
    console.error('Places search error:', error);
    return NextResponse.json(
      { error: 'Failed to search places' },
      { status: 500 }
    );
  }
}
