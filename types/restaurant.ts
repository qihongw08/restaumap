import type {
  Restaurant as PrismaRestaurant,
  Visit,
  Photo,
  Import,
  RestaurantStatus,
} from "@prisma/client";

export type { RestaurantStatus };

export type Restaurant = PrismaRestaurant;
export type { Import };

export type RestaurantWithVisits = Restaurant & {
  visits: Visit[];
};

export type RestaurantWithDetails = Restaurant & {
  visits: Visit[];
  photos: Photo[];
  imports?: Import[];
  photoReferences: string[];
  openingHoursWeekdayText?: string[];
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
