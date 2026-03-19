"use server";

import { z } from "zod";
import { authActionClient, authMutationClient } from "@/lib/safe-action";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

const createPhotosSchema = z.object({
  visitId: z.string(),
  restaurantId: z.string(),
  urls: z.array(z.string()),
});

export const createPhotosAction = authMutationClient
  .inputSchema(createPhotosSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { visitId, restaurantId, urls } = parsedInput;

    const visit = await prisma.visit.findUnique({ where: { id: visitId } });
    if (!visit || visit.userId !== ctx.user.id) {
      throw new Error("Visit not found");
    }

    const validUrls = urls.filter((u) => u.trim().length > 0);
    if (validUrls.length === 0) throw new Error("No valid urls provided");

    await prisma.photo.createMany({
      data: validUrls.map((url) => ({
        userId: ctx.user.id,
        restaurantId,
        visitId,
        url,
      })),
    });

    revalidatePath(`/restaurants/${restaurantId}`);
    return { count: validUrls.length };
  });

const deletePhotoSchema = z.object({ id: z.string() });

export const deletePhotoAction = authMutationClient
  .inputSchema(deletePhotoSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { id } = parsedInput;

    const photo = await prisma.photo.findUnique({ where: { id } });
    if (!photo || photo.userId !== ctx.user.id) {
      throw new Error("Photo not found");
    }

    await prisma.photo.delete({ where: { id } });
    
    revalidatePath(`/restaurants/${photo.restaurantId}`);
    return { id };
  });
