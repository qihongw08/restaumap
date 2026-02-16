import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import type { Restaurant } from '@prisma/client';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const restaurant = await prisma.restaurant.findUnique({
      where: { id },
      include: {
        visits: { orderBy: { visitDate: 'desc' } },
        photos: true,
      },
    });

    if (!restaurant) {
      return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 });
    }

    return NextResponse.json({ data: restaurant });
  } catch (error) {
    console.error('Get restaurant error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch restaurant' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const restaurant = await prisma.restaurant.update({
      where: { id },
      data: {
        ...(body.name != null && { name: body.name }),
        ...(body.address !== undefined && { address: body.address }),
        ...(body.formattedAddress !== undefined && {
          formattedAddress: body.formattedAddress,
        }),
        ...(body.latitude !== undefined && { latitude: body.latitude }),
        ...(body.longitude !== undefined && { longitude: body.longitude }),
        ...(body.cuisineTypes !== undefined && { cuisineTypes: body.cuisineTypes }),
        ...(body.popularDishes !== undefined && {
          popularDishes: body.popularDishes,
        }),
        ...(body.priceRange !== undefined && { priceRange: body.priceRange }),
        ...(body.ambianceTags !== undefined && { ambianceTags: body.ambianceTags }),
        ...(body.status != null && { status: body.status as Restaurant['status'] }),
      },
    });

    return NextResponse.json({ data: restaurant });
  } catch (error) {
    console.error('Update restaurant error:', error);
    return NextResponse.json(
      { error: 'Failed to update restaurant' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.restaurant.delete({ where: { id } });
    return NextResponse.json({ data: { id } });
  } catch (error) {
    console.error('Delete restaurant error:', error);
    return NextResponse.json(
      { error: 'Failed to delete restaurant' },
      { status: 500 }
    );
  }
}
