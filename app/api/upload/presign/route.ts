import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { presignUploadUrl } from "@/lib/r2";
import { prisma } from "@/lib/prisma";

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const MAX_SIZE_BYTES = 100 * 1024 * 1024;

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const body = await request.json();
    const { restaurantId, groupId, files } = body as {
      restaurantId: string;
      groupId?: string;
      files: { name: string; type: string; size: number }[];
    };

    if (!restaurantId?.trim()) {
      return NextResponse.json({ error: "restaurantId is required" }, { status: 400 });
    }
    if (!Array.isArray(files) || files.length === 0) {
      return NextResponse.json({ error: "files array is required" }, { status: 400 });
    }

    const resolvedGroupId = groupId?.trim() || null;

    if (resolvedGroupId) {
      const membership = await prisma.groupMember.findUnique({
        where: { groupId_userId: { groupId: resolvedGroupId, userId: user.id } },
      });
      if (!membership) {
        return NextResponse.json({ error: "Not a member of this group" }, { status: 403 });
      }
    }

    const results = await Promise.all(
      files.map(async (f) => {
        if (!ALLOWED_TYPES.has(f.type)) {
          throw new Error(`Invalid type: ${f.type}`);
        }
        const size = Number(f.size);
        if (!Number.isInteger(size) || size <= 0 || size > MAX_SIZE_BYTES) {
          throw new Error(`Invalid file size (max 10 MB)`);
        }
        return presignUploadUrl(f.type, size, {
          userId: user.id,
          restaurantId: restaurantId.trim(),
          groupId: resolvedGroupId,
        });
      }),
    );

    return NextResponse.json({ uploads: results });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to generate upload URL";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
