import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { generateShareToken, getShareExpiryDate } from "@/lib/share";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id: groupId } = await params;
    const member = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId: user.id } },
    });
    if (!member) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    const token = generateShareToken();
    const share = await prisma.shareLink.create({
      data: {
        token,
        type: "GROUP_MAP",
        ownerUserId: user.id,
        targetGroupId: groupId,
        expiresAt: getShareExpiryDate(),
      },
    });

    return NextResponse.json({
      data: { url: `${request.nextUrl.origin}/share/g/${share.token}` },
    });
  } catch (error) {
    console.error("Create group share link error:", error);
    return NextResponse.json(
      { error: "Failed to create share link" },
      { status: 500 },
    );
  }
}
