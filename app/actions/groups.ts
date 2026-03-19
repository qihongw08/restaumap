"use server";

import { z } from "zod";
import { authActionClient, authMutationClient } from "@/lib/safe-action";
import { prisma } from "@/lib/prisma";
import type { GroupMember } from "@prisma/client";

export const getGroupsAction = authActionClient.action(async ({ ctx }) => {
  const groups = await prisma.group.findMany({
    where: { members: { some: { userId: ctx.user.id } } },
    include: {
      members: true,
      _count: { select: { groupRestaurants: true } },
    },
    orderBy: { updatedAt: "desc" },
  });
  return groups;
});

const createGroupSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
});

export const createGroupAction = authMutationClient
  .inputSchema(createGroupSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { name } = parsedInput;
    const group = await prisma.group.create({
      data: {
        name,
        createdById: ctx.user.id,
        members: { create: { userId: ctx.user.id, role: "owner" } },
      },
      include: {
        members: true,
        _count: { select: { groupRestaurants: true } },
      },
    });
    return group;
  });

const joinGroupSchema = z.object({
  token: z.string().min(1, "Token is required"),
});

export const joinGroupAction = authMutationClient
  .inputSchema(joinGroupSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { token } = parsedInput;
    const invite = await prisma.groupInvite.findUnique({
      where: { token },
      include: { group: true },
    });

    if (!invite || invite.expiresAt < new Date() || invite.usedById) {
      throw new Error("Invalid or expired invite");
    }

    const existing = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId: invite.groupId, userId: ctx.user.id } },
    });

    if (existing) {
      return { groupId: invite.groupId };
    }

    await prisma.$transaction([
      prisma.groupMember.create({
        data: { groupId: invite.groupId, userId: ctx.user.id, role: "member" },
      }),
      prisma.groupInvite.update({
        where: { id: invite.id },
        data: { usedById: ctx.user.id },
      }),
    ]);

    return { groupId: invite.groupId };
  });

const reorderGroupsSchema = z.object({
  groupIds: z.array(z.string().uuid()),
});

export const reorderGroupsAction = authMutationClient
  .inputSchema(reorderGroupsSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { groupIds } = parsedInput;

    const userGroups = await prisma.groupMember.findMany({
      where: {
        userId: ctx.user.id,
        groupId: { in: groupIds },
      },
    });

    if (userGroups.length !== groupIds.length) {
      throw new Error("Invalid request: Some groups do not belong to user");
    }

    const updates = groupIds.map((groupId, index) =>
      prisma.groupMember.update({
        where: { groupId_userId: { groupId, userId: ctx.user.id } },
        data: { sortOrder: index },
      })
    );

    await prisma.$transaction(updates);
    return { success: true };
  });

const getGroupSchema = z.object({
  id: z.uuid(),
});

export const getGroupAction = authActionClient
  .inputSchema(getGroupSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { id } = parsedInput;
    const group = await prisma.group.findUnique({
      where: { id },
      include: {
        members: true,
        groupRestaurants: {
          include: { restaurant: true },
          orderBy: { addedAt: "desc" },
        },
      },
    });

    if (!group) throw new Error("Group not found");

    const currentMember = group.members.find(m => m.userId === ctx.user.id);
    if (!currentMember) throw new Error("Group not found");

    // We can fetch mapped data similarly
    const memberIds = group.members.map((m) => m.userId);
    const users =
      memberIds.length > 0
        ? await prisma.user.findMany({
            where: { id: { in: memberIds } },
            select: { id: true, username: true, avatarUrl: true },
          })
        : [];
    const userMap = Object.fromEntries(users.map((u) => [u.id, u]));
    const membersWithUser = group.members.map((m) => ({
      id: m.id,
      userId: m.userId,
      role: m.role,
      user: userMap[m.userId]
        ? {
            username: userMap[m.userId].username,
            avatarUrl: userMap[m.userId].avatarUrl ?? undefined,
          }
        : null,
    }));

    const groupVisits = await prisma.visit.findMany({
      where: { groupId: id },
      orderBy: { visitDate: "desc" },
      include: {
        photos: { select: { id: true, url: true } },
        restaurant: { select: { id: true, name: true } },
      },
    });

    return {
      ...group,
      members: membersWithUser,
      groupVisits,
      currentUserId: ctx.user.id,
      currentMember: { role: currentMember.role },
    };
  });

const updateGroupSchema = z.object({
  id: z.uuid(),
  name: z.string().trim().min(1, "Name is required"),
});

export const updateGroupAction = authMutationClient
  .inputSchema(updateGroupSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { id, name } = parsedInput;
    const member = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId: id, userId: ctx.user.id } },
    });
    if (!member || member.role !== "owner") throw new Error("Forbidden");

    const group = await prisma.group.update({
      where: { id },
      data: { name },
      include: {
        members: true,
        groupRestaurants: { include: { restaurant: true } },
      },
    });
    return group;
  });

const deleteGroupSchema = z.object({
  id: z.uuid(),
});

export const deleteGroupAction = authMutationClient
  .inputSchema(deleteGroupSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { id } = parsedInput;
    const member = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId: id, userId: ctx.user.id } },
    });
    if (!member || member.role !== "owner") throw new Error("Forbidden");

    await prisma.group.delete({ where: { id } });
    return { id };
  });

const createGroupInviteSchema = z.object({
  groupId: z.string().min(1, "Group ID is required"),
});

export const createGroupInviteAction = authMutationClient
  .inputSchema(createGroupInviteSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { groupId } = parsedInput;

    const membership = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId: ctx.user.id } },
    });
    if (!membership || membership.role !== "owner") {
      throw new Error("Only the group owner can create invites");
    }

    const token = Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 10);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const invite = await prisma.groupInvite.create({
      data: {
        groupId,
        token,
        expiresAt,
      },
    });

    const url = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/groups/join?token=${invite.token}`;
    return { url };
  });

const addRestaurantToGroupSchema = z.object({
  groupId: z.string().min(1, "Group ID is required"),
  restaurantId: z.string().min(1, "Restaurant ID is required"),
});

export const addRestaurantToGroupAction = authMutationClient
  .inputSchema(addRestaurantToGroupSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { groupId, restaurantId } = parsedInput;

    const membership = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId: ctx.user.id } },
    });
    if (!membership) throw new Error("Not a member of this group");

    await prisma.groupRestaurant.create({
      data: {
        groupId,
        restaurantId,
        addedById: ctx.user.id,
      },
    });

    return { success: true };
  });

const removeRestaurantFromGroupSchema = z.object({
  groupId: z.string().min(1, "Group ID is required"),
  restaurantId: z.string().min(1, "Restaurant ID is required"),
});

export const removeRestaurantFromGroupAction = authMutationClient
  .inputSchema(removeRestaurantFromGroupSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { groupId, restaurantId } = parsedInput;

    const membership = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId: ctx.user.id } },
    });
    if (!membership) throw new Error("Not a member of this group");

    await prisma.groupRestaurant.deleteMany({
      where: { groupId, restaurantId },
    });

    return { success: true };
  });

const removeMemberSchema = z.object({
  groupId: z.uuid(),
  userId: z.string(),
});

export const removeMemberAction = authMutationClient
  .inputSchema(removeMemberSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { groupId, userId } = parsedInput;

    const caller = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId: ctx.user.id } },
    });
    if (!caller || caller.role !== "owner") throw new Error("Forbidden");

    if (userId === ctx.user.id) throw new Error("Owner cannot remove themselves");

    await prisma.groupMember.delete({
      where: { groupId_userId: { groupId, userId } },
    });

    return { success: true };
  });

const leaveGroupSchema = z.object({
  groupId: z.uuid(),
});

export const leaveGroupAction = authMutationClient
  .inputSchema(leaveGroupSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { groupId } = parsedInput;

    const member = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId: ctx.user.id } },
    });
    if (!member) throw new Error("Not a member");

    if (member.role === "owner") {
      throw new Error("Owner cannot leave the group. Delete the group instead.");
    }

    await prisma.groupMember.delete({
      where: { groupId_userId: { groupId, userId: ctx.user.id } },
    });

    return { success: true };
  });
