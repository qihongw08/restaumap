import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

/**
 * GET /api/restaurants/[id]/groups
 * Returns groups the current user is in that include this restaurant (for log-visit group selector).
 */
export async function GET() {
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const groups = await prisma.group.findMany({
    where: {
      members: { some: { userId: user.id } },
    },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({ data: groups });
}
