import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const reason = (body.reason as string) ?? null;

    const restaurant = await prisma.restaurant.update({
      where: { id },
      data: {
        isBlacklisted: true,
        blacklistReason: reason,
        blacklistedAt: new Date(),
      },
    });

    return NextResponse.json({ data: restaurant });
  } catch (error) {
    console.error('Blacklist restaurant error:', error);
    return NextResponse.json(
      { error: 'Failed to blacklist restaurant' },
      { status: 500 }
    );
  }
}
