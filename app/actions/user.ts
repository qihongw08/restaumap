"use server";

import { z } from "zod";
import { authActionClient, authMutationClient } from "@/lib/safe-action";
import { prisma } from "@/lib/prisma";

export const getMeAction = authActionClient
  .action(async ({ ctx }) => {
    const dbUser = await prisma.user.findUnique({
      where: { id: ctx.user.id },
      select: { username: true, avatarUrl: true },
    });

    if (!dbUser) {
      throw new Error("User not found");
    }

    return {
      username: dbUser.username,
      avatarUrl: dbUser.avatarUrl,
    };
  });

const updateUsernameSchema = z.object({
  username: z.string().trim().min(2, "Username must be at least 2 characters").max(50),
});

export const updateUsernameAction = authMutationClient
  .inputSchema(updateUsernameSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { username } = parsedInput;

    const existing = await prisma.user.findFirst({
      where: { username, id: { not: ctx.user.id } },
    });

    if (existing) {
      throw new Error("Username is already taken");
    }

    await prisma.user.upsert({
      where: { id: ctx.user.id },
      create: {
        id: ctx.user.id,
        username,
        email: ctx.user.email ?? null,
      },
      update: { username },
    });

    return { username };
  });
