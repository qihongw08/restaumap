import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  calculatePFRatio,
  isValidFullnessOrTaste,
  isValidPrice,
} from '@/lib/utils';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      restaurantId,
      visitDate,
      fullnessScore,
      tasteScore,
      pricePaid,
      serviceRating,
      ambianceRating,
      notes,
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

    const pfRatio = calculatePFRatio(
      Number(fullnessScore),
      Number(tasteScore),
      Number(pricePaid)
    );

    const [visit] = await prisma.$transaction([
      prisma.visit.create({
        data: {
          restaurantId,
          visitDate: new Date(visitDate),
          fullnessScore: Number(fullnessScore),
          tasteScore: Number(tasteScore),
          pricePaid: Number(pricePaid),
          pfRatio,
          serviceRating: serviceRating != null ? Number(serviceRating) : null,
          ambianceRating: ambianceRating != null ? Number(ambianceRating) : null,
          notes: notes ?? null,
        },
      }),
      prisma.restaurant.update({
        where: { id: restaurantId },
        data: { status: 'VISITED' },
      }),
    ]);

    return NextResponse.json({ data: visit }, { status: 201 });
  } catch (error) {
    console.error('Create visit error:', error);
    return NextResponse.json(
      { error: 'Failed to create visit' },
      { status: 500 }
    );
  }
}
