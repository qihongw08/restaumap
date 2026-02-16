import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const token = request.nextUrl.searchParams.get('token') ?? (await request.json()).token;
  if (!token || typeof token !== 'string') {
    return NextResponse.json({ error: 'Token is required' }, { status: 400 });
  }
  const invite = await prisma.groupInvite.findUnique({
    where: { token },
    include: { group: true },
  });
  if (!invite || invite.expiresAt < new Date() || invite.usedById) {
    return NextResponse.json({ error: 'Invalid or expired invite' }, { status: 400 });
  }
  const existing = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId: invite.groupId, userId: user.id } },
  });
  if (existing) {
    return NextResponse.json({ data: { groupId: invite.groupId } });
  }
  await prisma.$transaction([
    prisma.groupMember.create({
      data: { groupId: invite.groupId, userId: user.id, role: 'member' },
    }),
    prisma.groupInvite.update({
      where: { id: invite.id },
      data: { usedById: user.id },
    }),
  ]);
  return NextResponse.json({ data: { groupId: invite.groupId } });
}
