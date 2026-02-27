import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { generateShareToken, getShareExpiryDate } from "@/lib/share";

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const token = generateShareToken();
    const share = await prisma.shareLink.create({
      data: {
        token,
        type: "USER_MAP",
        ownerUserId: user.id,
        targetUserId: user.id,
        expiresAt: getShareExpiryDate(),
      },
    });

    return NextResponse.json({
      data: { url: `${request.nextUrl.origin}/share/u/${share.token}` },
    });
  } catch (error) {
    console.error("Create user share link error:", error);
    return NextResponse.json(
      { error: "Failed to create share link" },
      { status: 500 },
    );
  }
}
