import type {
  Restaurant as PrismaRestaurant,
  Photo,
  Import,
  RestaurantStatus,
} from "@prisma/client";
import type { VisitWithPhotos } from "@/types/visit";

export type { RestaurantStatus };

export type Restaurant = PrismaRestaurant;
export type { Import };

export type RestaurantWithVisits = Omit<Restaurant, "createdAt" | "updatedAt"> & {
  createdAt: Date | string;
  updatedAt: Date | string;
  visits: VisitWithPhotos[];
  status: RestaurantStatus;
  isBlacklisted?: boolean;
  sourceUrl?: string | null;
};

export type RestaurantWithDetails = Restaurant & {
  visits: VisitWithPhotos[];
  photos: Photo[];
  imports?: Import[];
  photoReferences: string[];
  openingHoursWeekdayText?: string[];
  sourceUrl?: string | null;
  sourcePlatform?: string | null;
  rawCaption?: string | null;
  savedAt?: string | Date;
  /** From UserRestaurant (per-user), merged by API */
  status: RestaurantStatus;
  isBlacklisted?: boolean;
};

export interface RestaurantFormData {
  name: string;
  address?: string;
  formattedAddress?: string;
  latitude?: number;
  longitude?: number;
  sourceUrl?: string;
  sourcePlatform?: string;
  rawCaption?: string;
  cuisineTypes: string[];
  popularDishes: string[];
  priceRange?: string;
  ambianceTags: string[];
  status?: RestaurantStatus;
}
