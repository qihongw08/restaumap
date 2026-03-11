import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { isValidFullnessOrTaste, isValidPrice } from "@/lib/utils";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await params;
    const visit = await prisma.visit.findUnique({ where: { id } });
    if (!visit || visit.userId !== user.id) {
      return NextResponse.json(
        { error: "Visit not found" },
        { status: 404 },
      );
    }

    const body = await request.json();
    const data: Record<string, unknown> = {};

    if (body.visitDate !== undefined) {
      data.visitDate = new Date(body.visitDate);
    }
    if (body.fullnessScore !== undefined) {
      if (!isValidFullnessOrTaste(body.fullnessScore)) {
        return NextResponse.json(
          { error: "fullnessScore must be 1-10" },
          { status: 400 },
        );
      }
      data.fullnessScore = Number(body.fullnessScore);
    }
    if (body.tasteScore !== undefined) {
      if (!isValidFullnessOrTaste(body.tasteScore)) {
        return NextResponse.json(
          { error: "tasteScore must be 1-10" },
          { status: 400 },
        );
      }
      data.tasteScore = Number(body.tasteScore);
    }
    if (body.pricePaid !== undefined) {
      if (!isValidPrice(Number(body.pricePaid))) {
        return NextResponse.json(
          { error: "pricePaid must be > 0" },
          { status: 400 },
        );
      }
      data.pricePaid = Number(body.pricePaid);
    }
    if (body.notes !== undefined) {
      data.notes = body.notes || null;
    }

    const updated = await prisma.visit.update({
      where: { id },
      data,
      include: { photos: true },
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error("Update visit error:", error);
    return NextResponse.json(
      { error: "Failed to update visit" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await params;
    const visit = await prisma.visit.findUnique({ where: { id } });
    if (!visit || visit.userId !== user.id) {
      return NextResponse.json(
        { error: "Visit not found" },
        { status: 404 },
      );
    }

    await prisma.visit.delete({ where: { id } });
    return NextResponse.json({ data: { id } });
  } catch (error) {
    console.error("Delete visit error:", error);
    return NextResponse.json(
      { error: "Failed to delete visit" },
      { status: 500 },
    );
  }
}
