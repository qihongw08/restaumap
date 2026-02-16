import type { Visit as PrismaVisit } from '@prisma/client';

export type Visit = PrismaVisit;

export interface VisitFormData {
  restaurantId: string;
  visitDate: string;
  fullnessScore: number;
  tasteScore: number;
  pricePaid: number;
  serviceRating?: number;
  ambianceRating?: number;
  notes?: string;
}
