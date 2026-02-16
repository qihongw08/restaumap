import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

async function checkMember(groupId: string, userId: string) {
  const m = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId } },
  });
  return !!m;
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; restaurantId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { id: groupId, restaurantId } = await params;
  const ok = await checkMember(groupId, user.id);
  if (!ok) {
    return NextResponse.json({ error: 'Group not found' }, { status: 404 });
  }
  await prisma.groupRestaurant.deleteMany({
    where: { groupId, restaurantId },
  });
  return NextResponse.json({ data: { restaurantId } });
}
