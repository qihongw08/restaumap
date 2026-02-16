import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import type { ApiResponse } from '@/types/api';
import type { Restaurant } from '@prisma/client';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');
    const excludeBlacklisted = searchParams.get('excludeBlacklisted') !== 'false';

    const restaurants = await prisma.restaurant.findMany({
      where: {
        ...(status ? { status: status as Restaurant['status'] } : {}),
        ...(excludeBlacklisted ? { isBlacklisted: false } : {}),
      },
      orderBy: { createdAt: 'desc' },
      include: { visits: { orderBy: { visitDate: 'desc' }, take: 5 } },
    });

    return NextResponse.json({ data: restaurants } satisfies ApiResponse<typeof restaurants>);
  } catch (error) {
    console.error('Get restaurants error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch restaurants' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const restaurant = await prisma.restaurant.create({
      data: {
        name: body.name,
        address: body.address ?? null,
        formattedAddress: body.formattedAddress ?? null,
        latitude: body.latitude ?? null,
        longitude: body.longitude ?? null,
        sourceUrl: body.sourceUrl ?? null,
        sourcePlatform: body.sourcePlatform ?? null,
        rawCaption: body.rawCaption ?? null,
        cuisineTypes: body.cuisineTypes ?? [],
        popularDishes: body.popularDishes ?? [],
        priceRange: body.priceRange ?? null,
        ambianceTags: body.ambianceTags ?? [],
        status: body.status ?? 'WANT_TO_GO',
      },
    });

    return NextResponse.json(
      { data: restaurant },
      { status: 201 }
    );
  } catch (error) {
    console.error('Create restaurant error:', error);
    return NextResponse.json(
      { error: 'Failed to create restaurant' },
      { status: 500 }
    );
  }
}
