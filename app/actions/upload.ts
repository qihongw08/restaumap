"use server";

import { z } from "zod";
import { authActionClient } from "@/lib/safe-action";
import { uploadToR2, presignUploadUrl } from "@/lib/r2";
import { prisma } from "@/lib/prisma";

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const MAX_SIZE_BYTES = 100 * 1024 * 1024;

const presignUploadsSchema = z.object({
  restaurantId: z.string().min(1, "restaurantId is required"),
  groupId: z.string().optional().nullable(),
  files: z.array(
    z.object({
      name: z.string(),
      type: z.string(),
      size: z.number(),
    })
  ).min(1, "files array is required"),
});

export const presignUploadsAction = authActionClient
  .inputSchema(presignUploadsSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { restaurantId, groupId, files } = parsedInput;
    const resolvedGroupId = groupId?.trim() || null;

    if (resolvedGroupId) {
      const membership = await prisma.groupMember.findUnique({
        where: { groupId_userId: { groupId: resolvedGroupId, userId: ctx.user.id } },
      });
      if (!membership) throw new Error("Not a member of this group");
    }

    const results = await Promise.all(
      files.map(async (f) => {
        if (!ALLOWED_TYPES.has(f.type)) throw new Error(`Invalid type: ${f.type}`);
        const size = Number(f.size);
        if (!Number.isInteger(size) || size <= 0 || size > MAX_SIZE_BYTES) {
          throw new Error("Invalid file size (max 10 MB)");
        }
        return presignUploadUrl(f.type, size, {
          userId: ctx.user.id,
          restaurantId: restaurantId.trim(),
          groupId: resolvedGroupId,
        });
      })
    );

    return { uploads: results };
  });

const directUploadSchema = z.custom<FormData>((data) => data instanceof FormData, "Must be FormData");

export const directUploadAction = authActionClient
  .inputSchema(directUploadSchema)
  .action(async ({ parsedInput, ctx }) => {
    const formData = parsedInput;
    const files = formData.getAll("files");
    
    if (!files.length || !(files[0] instanceof File)) {
      throw new Error("No files. Send multipart/form-data with 'files' (one or more).");
    }
    
    const restaurantId = formData.get("restaurantId");
    if (typeof restaurantId !== "string" || !restaurantId.trim()) {
      throw new Error("restaurantId is required (form field).");
    }
    
    const groupId = formData.get("groupId");
    const groupIdVal = typeof groupId === "string" && groupId.trim() ? groupId.trim() : null;
    
    const urls: string[] = [];
    for (const entry of files) {
      const file = entry as File;
      const buffer = Buffer.from(await file.arrayBuffer());
      const url = await uploadToR2(
        {
          buffer,
          mimetype: file.type || "image/jpeg",
          originalFilename: file.name,
        },
        {
          userId: ctx.user.id,
          restaurantId: restaurantId.trim(),
          groupId: groupIdVal,
        }
      );
      urls.push(url);
    }
    
    return { urls };
  });
