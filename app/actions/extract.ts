"use server";

import { z } from "zod";
import { authActionClient } from "@/lib/safe-action";
import {
  extractRestaurantFromPlace,
  extractRestaurantFromInstagram,
  extractRestaurantFromXiaohongshu,
} from "@/lib/groq";
import {
  isInstagramUrl,
  normalizeInstagramUrl,
  getInstagramCaption,
} from "@/lib/instagram";

const extractRestaurantSchema = z.object({
  name: z.string().min(1, "Missing restaurant name"),
  addressOrRegion: z.string().nullable().optional(),
});

export const extractRestaurantAction = authActionClient
  .inputSchema(extractRestaurantSchema)
  .action(async ({ parsedInput }) => {
    let addressOrRegion = parsedInput.addressOrRegion ?? null;
    const data = await extractRestaurantFromPlace(parsedInput.name, addressOrRegion);
    return data;
  });

async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch {
    try {
      return await fn();
    } catch (second) {
      console.error("Extract retry failed:", second);
      throw second;
    }
  }
}

const extractLinkSchema = z.object({
  text: z.string().optional(),
  url: z.string().optional(),
  caption: z.string().optional(),
});

function isXiaohongshuUrl(raw: string): boolean {
  return raw.includes("xhslink.com");
}

export const extractLinkAction = authActionClient
  .inputSchema(extractLinkSchema)
  .action(async ({ parsedInput }) => {
    const raw = (parsedInput.text ?? parsedInput.url ?? parsedInput.caption ?? "").trim();
    if (!raw) {
      throw new Error("Missing text, url, or caption in body");
    }

    if (isInstagramUrl(raw)) {
      const normalized = normalizeInstagramUrl(raw) ?? raw;
      const result = await getInstagramCaption(normalized);
      const text = result.caption?.trim();

      if (!text) {
        throw new Error("Could not extract caption from Instagram post");
      }

      const extracted = await withRetry(() => extractRestaurantFromInstagram(text));
      return extracted;
    } else if (isXiaohongshuUrl(raw)) {
      const extracted = await withRetry(() => extractRestaurantFromXiaohongshu(raw));
      return extracted;
    } else {
      throw new Error("Only Instagram and Xiaohongshu URLs are supported");
    }
  });
