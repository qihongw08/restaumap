import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

async function getGroupAndCheckMember(groupId: string, userId: string) {
  const group = await prisma.group.findUnique({
    where: { id: groupId },
    include: {
      members: true,
      groupRestaurants: { include: { restaurant: true }, orderBy: { addedAt: 'desc' } },
    },
  });
  if (!group) return null;
  const isMember = group.members.some((m) => m.userId === userId);
  if (!isMember) return null;
  return group;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { id } = await params;
  const group = await getGroupAndCheckMember(id, user.id);
  if (!group) {
    return NextResponse.json({ error: 'Group not found' }, { status: 404 });
  }
  const currentMember = group.members.find((m) => m.userId === user.id);
  return NextResponse.json({
    data: { ...group, currentMember: currentMember ? { role: currentMember.role } : null },
  });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { id } = await params;
  const member = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId: id, userId: user.id } },
  });
  if (!member || member.role !== 'owner') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const body = await request.json();
  const name = typeof body.name === 'string' ? body.name.trim() : undefined;
  if (!name) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 });
  }
  const group = await prisma.group.update({
    where: { id },
    data: { name },
    include: { members: true, groupRestaurants: { include: { restaurant: true } } },
  });
  return NextResponse.json({ data: group });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { id } = await params;
  const member = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId: id, userId: user.id } },
  });
  if (!member || member.role !== 'owner') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  await prisma.group.delete({ where: { id } });
  return NextResponse.json({ data: { id } });
}
