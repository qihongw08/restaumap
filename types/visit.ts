import type { Visit as PrismaVisit, Photo } from '@prisma/client';

export type Visit = PrismaVisit;

export type VisitWithPhotos = Omit<Visit, "visitDate" | "createdAt" | "updatedAt"> & {
  visitDate: Date | string;
  createdAt: Date | string;
  updatedAt: Date | string;
  photos?: (Omit<Pick<Photo, "id" | "url" | "uploadedAt">, "uploadedAt"> & { uploadedAt: Date | string })[];
};

export interface VisitLogWithLocation {
  id: string;
  userId: string;
  restaurantId: string;
  visitDate: string;
  fullnessScore: number;
  tasteScore: number;
  pricePaid: number;
  notes: string | null;
  photos: { id: string; url: string }[];
  restaurant: { id: string; name: string; latitude: number; longitude: number };
}

/** Lightweight visit log marker for map rendering */
export interface VisitLogMarker {
  id: string;
  restaurantId: string;
  visitDate: string;
  firstPhotoUrl: string | null;
  restaurant: { id: string; name: string; latitude: number; longitude: number };
}

export interface VisitFormData {
  restaurantId: string;
  visitDate: string;
  fullnessScore: number;
  tasteScore: number;
  pricePaid: number;
  notes?: string;
  groupId?: string;
  photoUrls?: string[];
}
