import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { groupIds } = await req.json();

    if (!Array.isArray(groupIds)) {
      return new NextResponse("Invalid request: groupIds must be an array", { status: 400 });
    }

    // Verify all groups belong to the user
    const userGroups = await prisma.groupMember.findMany({
      where: {
        userId: user.id,
        groupId: { in: groupIds }
      }
    });

    if (userGroups.length !== groupIds.length) {
      return new NextResponse("Invalid request: Some groups do not belong to user", { status: 403 });
    }

    // Update sortOrder for each group using a transaction
    const updates = groupIds.map((groupId, index) =>
      prisma.groupMember.update({
        where: {
          groupId_userId: {
            groupId,
            userId: user.id
          }
        },
        data: { sortOrder: index }
      })
    );

    await prisma.$transaction(updates);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error reordering groups:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
