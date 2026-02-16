import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

async function checkMember(groupId: string, userId: string) {
  const m = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId } },
  });
  return !!m;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { id: groupId } = await params;
  const ok = await checkMember(groupId, user.id);
  if (!ok) {
    return NextResponse.json({ error: 'Group not found' }, { status: 404 });
  }
  const body = await request.json();
  const restaurantId = typeof body.restaurantId === 'string' ? body.restaurantId : null;
  if (!restaurantId) {
    return NextResponse.json({ error: 'restaurantId is required' }, { status: 400 });
  }
  const restaurant = await prisma.restaurant.findUnique({ where: { id: restaurantId } });
  if (!restaurant) {
    return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 });
  }
  const created = await prisma.groupRestaurant.upsert({
    where: {
      groupId_restaurantId: { groupId, restaurantId },
    },
    create: {
      groupId,
      restaurantId,
      addedById: user.id,
    },
    update: {},
    include: { restaurant: true },
  });
  return NextResponse.json({ data: created }, { status: 201 });
}
