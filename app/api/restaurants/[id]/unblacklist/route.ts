import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const restaurant = await prisma.restaurant.update({
      where: { id },
      data: {
        isBlacklisted: false,
        blacklistReason: null,
        blacklistedAt: null,
      },
    });

    return NextResponse.json({ data: restaurant });
  } catch (error) {
    console.error('Unblacklist restaurant error:', error);
    return NextResponse.json(
      { error: 'Failed to restore restaurant' },
      { status: 500 }
    );
  }
}
