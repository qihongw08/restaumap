import type { Visit as PrismaVisit, Photo } from '@prisma/client';

export type Visit = PrismaVisit;

export type VisitWithPhotos = Omit<Visit, "visitDate" | "createdAt" | "updatedAt"> & {
  visitDate: Date | string;
  createdAt: Date | string;
  updatedAt: Date | string;
  photos?: (Omit<Pick<Photo, "id" | "url" | "uploadedAt">, "uploadedAt"> & { uploadedAt: Date | string })[];
};

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
