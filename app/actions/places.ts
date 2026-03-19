"use server";

import { z } from "zod";
import { authActionClient } from "@/lib/safe-action";
import { searchPlaces } from "@/lib/places";
import { geocodeAddress } from "@/lib/maps";

function extractCityStateZip(address: string): string {
  const parts = address
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length <= 2) return address.trim();
  return parts.slice(-2).join(", ");
}

const searchPlacesSchema = z.object({
  name: z.string().optional(),
  addressOrRegion: z.string().optional(),
}).refine(data => data.name || data.addressOrRegion, {
  message: "Missing name or addressOrRegion",
});

export const searchPlacesAction = authActionClient
  .inputSchema(searchPlacesSchema)
  .action(async ({ parsedInput }) => {
    const name = parsedInput.name ?? "";
    const addressOrRegion = parsedInput.addressOrRegion
      ? extractCityStateZip(parsedInput.addressOrRegion)
      : "";
    const query = [name, addressOrRegion].filter(Boolean).join(", ");

    if (!query.trim()) {
      throw new Error("Missing name or addressOrRegion");
    }

    const candidates = await searchPlaces(query);
    return candidates;
  });

const geocodeSchema = z.object({
  address: z.string().optional(),
  query: z.string().optional(),
}).refine(data => data.address || data.query, {
  message: "Missing address or query",
});

export const geocodeAction = authActionClient
  .inputSchema(geocodeSchema)
  .action(async ({ parsedInput }) => {
    const address = parsedInput.address ?? parsedInput.query ?? "";

    const result = await geocodeAddress(address);
    if (!result) {
      throw new Error("Geocoding failed or no results");
    }

    return result;
  });
