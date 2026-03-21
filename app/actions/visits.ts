"use server";

import { z } from "zod";
import { authActionClient, authMutationClient } from "@/lib/safe-action";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { isValidFullnessOrTaste, isValidPrice } from "@/lib/utils";

const getVisitsSchema = z.object({
  limit: z.number().min(1).max(50).optional().default(10),
  cursor: z.string().optional().nullable(),
  groupId: z.string().optional().nullable(),
  restaurantId: z.string().optional().nullable(),
});

export const getVisitsAction = authActionClient
  .inputSchema(getVisitsSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { limit, cursor, groupId, restaurantId } = parsedInput;

    const items = await prisma.visit.findMany({
      where: {
        OR: [
          { userId: ctx.user.id },
          {
            group: {
              members: {
                some: { userId: ctx.user.id }
              }
            }
          }
        ],
        ...(groupId ? { groupId } : {}),
        ...(restaurantId ? { restaurantId } : {}),
      },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      orderBy: { visitDate: 'desc' },
      include: {
        restaurant: { select: { id: true, name: true, latitude: true, longitude: true } },
        photos: { select: { id: true, url: true } },
        group: { select: { id: true, name: true } },
      },
    });

    const hasMore = items.length > limit;
    const page = hasMore ? items.slice(0, limit) : items;

    const data = page.map((v) => ({
      id: v.id,
      userId: v.userId,
      restaurantId: v.restaurantId,
      visitDate: v.visitDate.toISOString(),
      fullnessScore: Number(v.fullnessScore),
      tasteScore: Number(v.tasteScore),
      pricePaid: Number(v.pricePaid),
      notes: v.notes,
      photos: v.photos,
      restaurant: v.restaurant,
      group: v.group ? { id: v.group.id, name: v.group.name } : null,
    }));

    const nextCursor = hasMore ? page[page.length - 1].id : null;
    return { data, nextCursor };
  });

const createVisitSchema = z.object({
  restaurantId: z.string(),
  visitDate: z.string(),
  fullnessScore: z.number().min(1).max(10),
  tasteScore: z.number().min(1).max(10),
  pricePaid: z.number().min(0),
  notes: z.string().optional().nullable(),
  groupId: z.string().optional().nullable(),
  photoUrls: z.array(z.string()).optional(),
});

export const createVisitAction = authMutationClient
  .inputSchema(createVisitSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { restaurantId, visitDate, fullnessScore, tasteScore, pricePaid, notes, groupId, photoUrls } = parsedInput;

    const link = await prisma.userRestaurant.findUnique({
      where: { userId_restaurantId: { userId: ctx.user.id, restaurantId } },
    });
    if (!link) throw new Error('Restaurant not in your list');

    if (groupId) {
      const member = await prisma.groupMember.findUnique({
        where: { groupId_userId: { groupId: groupId.trim(), userId: ctx.user.id } },
      });
      if (!member) throw new Error('Not a member of that group');
    }

    const urls = Array.isArray(photoUrls) ? photoUrls.filter((u) => u.trim() !== '') : [];

    const visit = await prisma.$transaction(async (tx) => {
      const v = await tx.visit.create({
        data: {
          userId: ctx.user.id,
          restaurantId,
          groupId: groupId ?? null,
          visitDate: new Date(`${visitDate}T12:00:00`),
          fullnessScore,
          tasteScore,
          pricePaid,
          notes: notes ?? null,
        },
      });
      
      if (urls.length > 0) {
        await tx.photo.createMany({
          data: urls.map((url) => ({
            userId: ctx.user.id,
            restaurantId,
            visitId: v.id,
            url,
          })),
        });
      }
      
      await tx.userRestaurant.update({
        where: { userId_restaurantId: { userId: ctx.user.id, restaurantId } },
        data: { status: 'VISITED' },
      });
      return tx.visit.findUnique({
        where: { id: v.id },
        include: { photos: true },
      });
    });

    revalidatePath(`/restaurants/${restaurantId}`);
    return visit;
  });

const updateVisitSchema = z.object({
  id: z.string(),
  visitDate: z.string().optional(),
  fullnessScore: z.number().min(1).max(10).optional(),
  tasteScore: z.number().min(1).max(10).optional(),
  pricePaid: z.number().min(0).optional(),
  notes: z.string().optional().nullable(),
});

export const updateVisitAction = authMutationClient
  .inputSchema(updateVisitSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { id, visitDate, fullnessScore, tasteScore, pricePaid, notes } = parsedInput;

    const visit = await prisma.visit.findUnique({ where: { id } });
    if (!visit || visit.userId !== ctx.user.id) throw new Error('Visit not found');

    const data: any = {};
    if (visitDate !== undefined) {
      data.visitDate = new Date(visitDate.includes("T") ? visitDate : `${visitDate}T12:00:00`);
    }
    if (fullnessScore !== undefined) data.fullnessScore = fullnessScore;
    if (tasteScore !== undefined) data.tasteScore = tasteScore;
    if (pricePaid !== undefined) data.pricePaid = pricePaid;
    if (notes !== undefined) data.notes = notes || null;

    const updated = await prisma.visit.update({
      where: { id },
      data,
      include: { photos: true },
    });

    revalidatePath(`/restaurants/${updated.restaurantId}`);
    return updated;
  });

const visitIdSchema = z.object({ id: z.string() });

export const deleteVisitAction = authMutationClient
  .inputSchema(visitIdSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { id } = parsedInput;
    const visit = await prisma.visit.findUnique({ where: { id } });
    if (!visit || visit.userId !== ctx.user.id) {
      throw new Error("Visit not found");
    }

    await prisma.visit.delete({ where: { id } });
    revalidatePath(`/restaurants/${visit.restaurantId}`);
    return { id };
  });

const getVisitMarkersSchema = z.object({
  groupId: z.string().optional().nullable(),
  minLat: z.number().optional().nullable(),
  maxLat: z.number().optional().nullable(),
  minLng: z.number().optional().nullable(),
  maxLng: z.number().optional().nullable(),
  limit: z.number().min(1).max(500).optional().default(200),
  cursor: z.string().optional().nullable(),
});

export const getVisitMarkersAction = authActionClient
  .inputSchema(getVisitMarkersSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { groupId, minLat, maxLat, minLng, maxLng, limit, cursor } = parsedInput;

    const hasBounds = minLat !== undefined && minLat !== null &&
                      maxLat !== undefined && maxLat !== null &&
                      minLng !== undefined && minLng !== null &&
                      maxLng !== undefined && maxLng !== null;

    const items = await prisma.visit.findMany({
      where: {
        OR: [
          { userId: ctx.user.id },
          {
            group: {
              members: {
                some: { userId: ctx.user.id }
              }
            }
          }
        ],
        ...(groupId ? { groupId } : {}),
        restaurant: {
          ...(hasBounds ? {
            latitude: { gte: minLat, lte: maxLat },
            longitude: { gte: minLng, lte: maxLng },
          } : {}),
        },
      },
      orderBy: { visitDate: "desc" },
      ...(hasBounds ? {} : {
        take: limit + 1,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      }),
      select: {
        id: true,
        restaurantId: true,
        visitDate: true,
        photos: { select: { url: true }, take: 1 },
        restaurant: {
          select: { id: true, name: true, latitude: true, longitude: true },
        },
      },
    });

    const hasMore = !hasBounds && items.length > limit;
    const page = hasBounds || !hasMore ? items : items.slice(0, limit);

    const data = page.map((v) => ({
      id: v.id,
      restaurantId: v.restaurantId,
      visitDate: v.visitDate.toISOString(),
      firstPhotoUrl: v.photos[0]?.url ?? null,
      restaurant: {
        id: v.restaurant.id,
        name: v.restaurant.name,
        latitude: v.restaurant.latitude!,
        longitude: v.restaurant.longitude!,
      },
    }));

    const nextCursor = hasBounds || !hasMore ? null : page[page.length - 1].id;
    return { data, nextCursor };
  });
