import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const groups = await prisma.group.findMany({
    where: {
      members: { some: { userId: user.id } },
    },
    include: {
      members: true,
      _count: { select: { groupRestaurants: true } },
    },
    orderBy: { updatedAt: 'desc' },
  });
  return NextResponse.json({ data: groups });
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const body = await request.json();
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  if (!name) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 });
  }
  const group = await prisma.group.create({
    data: {
      name,
      createdById: user.id,
      members: {
        create: { userId: user.id, role: 'owner' },
      },
    },
    include: {
      members: true,
      _count: { select: { groupRestaurants: true } },
    },
  });
  return NextResponse.json({ data: group }, { status: 201 });
}
