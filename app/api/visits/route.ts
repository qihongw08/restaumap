import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { isValidFullnessOrTaste, isValidPrice } from '@/lib/utils';

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const searchParams = request.nextUrl.searchParams;
    const limitParam = searchParams.get('limit');
    const cursor = searchParams.get('cursor');
    const groupId = searchParams.get('groupId') || undefined;
    const restaurantId = searchParams.get('restaurantId') || undefined;
    const limit = Math.min(Math.max(Number(limitParam) || 10, 1), 50);

    const items = await prisma.visit.findMany({
      where: {
        userId: user.id,
        ...(groupId ? { groupId } : {}),
        ...(restaurantId ? { restaurantId } : {}),
      },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      orderBy: { visitDate: 'desc' },
      include: {
        restaurant: { select: { id: true, name: true } },
        photos: { select: { id: true, url: true } },
        group: { select: { id: true, name: true } },
      },
    });

    const hasMore = items.length > limit;
    const page = hasMore ? items.slice(0, limit) : items;

    const data = page.map((v) => ({
      id: v.id,
      userId: v.userId,
      restaurantId: v.restaurantId,
      visitDate: v.visitDate.toISOString(),
      fullnessScore: Number(v.fullnessScore),
      tasteScore: Number(v.tasteScore),
      pricePaid: Number(v.pricePaid),
      notes: v.notes,
      photos: v.photos,
      restaurant: v.restaurant,
      group: v.group ? { id: v.group.id, name: v.group.name } : null,
    }));

    const nextCursor = hasMore ? page[page.length - 1].id : null;

    return NextResponse.json({ data, nextCursor });
  } catch (error) {
    console.error('Get visits error:', error);
    return NextResponse.json({ error: 'Failed to fetch visits' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const body = await request.json();

    const {
      restaurantId,
      visitDate,
      fullnessScore,
      tasteScore,
      pricePaid,
      notes,
      groupId: bodyGroupId,
      photoUrls,
    } = body;

    if (
      !restaurantId ||
      !visitDate ||
      !isValidFullnessOrTaste(fullnessScore) ||
      !isValidFullnessOrTaste(tasteScore) ||
      !isValidPrice(Number(pricePaid))
    ) {
      return NextResponse.json(
        {
          error:
            'Missing or invalid: restaurantId, visitDate, fullnessScore (1-10), tasteScore (1-10), pricePaid (>0)',
        },
        { status: 400 }
      );
    }

    const link = await prisma.userRestaurant.findUnique({
      where: { userId_restaurantId: { userId: user.id, restaurantId } },
    });
    if (!link) {
      return NextResponse.json(
        { error: 'Restaurant not in your list' },
        { status: 404 }
      );
    }

    if (bodyGroupId && typeof bodyGroupId === 'string') {
      const member = await prisma.groupMember.findUnique({
        where: {
          groupId_userId: { groupId: bodyGroupId.trim(), userId: user.id },
        },
      });
      if (!member) {
        return NextResponse.json(
          { error: 'Not a member of that group' },
          { status: 403 }
        );
      }
    }

    const urls = Array.isArray(photoUrls)
      ? (photoUrls as string[]).filter(
          (u): u is string => typeof u === 'string' && u.length > 0
        )
      : [];

    const visit = await prisma.$transaction(async (tx) => {
      const v = await tx.visit.create({
        data: {
          userId: user.id,
          restaurantId,
          groupId: bodyGroupId,
          visitDate: new Date(`${visitDate}T12:00:00`),
          fullnessScore: Number(fullnessScore),
          tasteScore: Number(tasteScore),
          pricePaid: Number(pricePaid),
          notes: notes ?? null,
        },
      });
      if (urls.length > 0) {
        await tx.photo.createMany({
          data: urls.map((url) => ({
            userId: user.id,
            restaurantId,
            visitId: v.id,
            url,
          })),
        });
      }
      await tx.userRestaurant.update({
        where: { userId_restaurantId: { userId: user.id, restaurantId } },
        data: { status: 'VISITED' },
      });
      return tx.visit.findUnique({
        where: { id: v.id },
        include: { photos: true },
      });
    });

    return NextResponse.json({ data: visit }, { status: 201 });
  } catch (error) {
    console.error('Create visit error:', error);
    return NextResponse.json(
      { error: 'Failed to create visit' },
      { status: 500 }
    );
  }
}
