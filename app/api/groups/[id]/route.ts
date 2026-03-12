import { NextRequest, NextResponse } from "next/server";
import type { GroupMember } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

async function getGroupAndCheckMember(groupId: string, userId: string) {
  const group = await prisma.group.findUnique({
    where: { id: groupId },
    include: {
      members: true,
      groupRestaurants: {
        include: { restaurant: true },
        orderBy: { addedAt: "desc" },
      },
    },
  });
  if (!group) return null;
  const isMember = group.members.some((m: GroupMember) => m.userId === userId);
  if (!isMember) return null;
  return group;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const group = await getGroupAndCheckMember(id, user.id);
  if (!group) {
    return NextResponse.json({ error: "Group not found" }, { status: 404 });
  }
  const currentMember = group.members.find(
    (m: GroupMember) => m.userId === user.id,
  );
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

  const addedPairs = group.groupRestaurants.map((gr) => ({
    userId: gr.addedById,
    restaurantId: gr.restaurantId,
  }));
  const userRestaurants =
    addedPairs.length > 0
      ? await prisma.userRestaurant.findMany({
          where: {
            OR: addedPairs.map((p) => ({
              userId: p.userId,
              restaurantId: p.restaurantId,
            })),
          },
          select: { userId: true, restaurantId: true, sourceUrl: true },
        })
      : [];
  const sourceUrlMap = new Map(
    userRestaurants.map((ur) => [
      `${ur.userId}:${ur.restaurantId}`,
      ur.sourceUrl ?? undefined,
    ]),
  );
  const groupRestaurantsWithSource = group.groupRestaurants.map((gr) => ({
    ...gr,
    sourceUrl: sourceUrlMap.get(`${gr.addedById}:${gr.restaurantId}`),
  }));

  const groupVisits = await prisma.visit.findMany({
    where: { groupId: id },
    orderBy: { visitDate: "desc" },
    include: {
      photos: { select: { id: true, url: true } },
      restaurant: { select: { id: true, name: true } },
    },
  });
  const groupVisitsWithUser = groupVisits.map((v) => {
    const u = userMap[v.userId];
    return {
      id: v.id,
      userId: v.userId,
      restaurantId: v.restaurantId,
      visitDate: v.visitDate,
      fullnessScore: v.fullnessScore,
      tasteScore: v.tasteScore,
      pricePaid: v.pricePaid,
      notes: v.notes,
      photos: v.photos,
      restaurant: v.restaurant,
      group: { id: group.id, name: group.name },
      user: u
        ? { username: u.username, avatarUrl: u.avatarUrl ?? undefined }
        : null,
    };
  });

  return NextResponse.json({
    data: {
      ...group,
      groupRestaurants: groupRestaurantsWithSource,
      members: membersWithUser,
      groupVisits: groupVisitsWithUser,
      currentUserId: user.id,
      currentMember: currentMember ? { role: currentMember.role } : null,
    },
  });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const member = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId: id, userId: user.id } },
  });
  if (!member || member.role !== "owner") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await request.json();
  const name = typeof body.name === "string" ? body.name.trim() : undefined;
  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }
  const group = await prisma.group.update({
    where: { id },
    data: { name },
    include: {
      members: true,
      groupRestaurants: { include: { restaurant: true } },
    },
  });
  return NextResponse.json({ data: group });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const member = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId: id, userId: user.id } },
  });
  if (!member || member.role !== "owner") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  await prisma.group.delete({ where: { id } });
  return NextResponse.json({ data: { id } });
}
