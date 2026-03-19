"use server";

import { z } from "zod";
import { authActionClient, authMutationClient } from "@/lib/safe-action";
import { prisma } from "@/lib/prisma";
import { generateShareToken, getShareExpiryDate } from "@/lib/share";

const createUserShareSchema = z.object({});

export const createUserShareAction = authMutationClient
  .inputSchema(createUserShareSchema)
  .action(async ({ ctx }) => {
    const token = generateShareToken();
    const expiresAt = getShareExpiryDate();

    const share = await prisma.shareLink.create({
      data: {
        token,
        type: "USER_MAP",
        ownerUserId: ctx.user.id,
        targetUserId: ctx.user.id,
        expiresAt,
      },
    });

    const url = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/share/u/${share.token}`;
    return { url };
  });

const createGroupShareSchema = z.object({
  groupId: z.string().min(1, "Group ID is required"),
});

export const createGroupShareAction = authMutationClient
  .inputSchema(createGroupShareSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { groupId } = parsedInput;

    const membership = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId: ctx.user.id } },
    });

    if (!membership) {
      throw new Error("You do not have access to share this group");
    }

    const token = generateShareToken();
    const expiresAt = getShareExpiryDate();

    const share = await prisma.shareLink.create({
      data: {
        token,
        type: "GROUP_MAP",
        ownerUserId: ctx.user.id,
        targetGroupId: groupId,
        expiresAt,
      },
    });

    const url = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/share/g/${share.token}`;
    return { url };
  });
