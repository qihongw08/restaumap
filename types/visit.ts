import type { Visit as PrismaVisit, Photo } from '@prisma/client';

export type Visit = PrismaVisit;

export type VisitWithPhotos = Visit & { photos?: Pick<Photo, 'id' | 'url'>[] };

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
