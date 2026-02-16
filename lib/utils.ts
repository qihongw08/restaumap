import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { PF_RATIO_FULLNESS_MAX, PF_RATIO_TASTE_MAX } from '@/lib/constants';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * PF Ratio = (Fullness × Taste) / Price
 */
export function calculatePFRatio(
  fullnessScore: number,
  tasteScore: number,
  pricePaid: number
): number {
  if (pricePaid <= 0) return 0;
  return (fullnessScore * tasteScore) / pricePaid;
}

export function formatPFRatio(value: number): string {
  return value.toFixed(2);
}

export function clampScore(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function isValidFullnessOrTaste(score: number): boolean {
  return (
    Number.isFinite(score) &&
    score >= 1 &&
    score <= PF_RATIO_FULLNESS_MAX
  );
}

export function isValidPrice(price: number): boolean {
  return Number.isFinite(price) && price > 0;
}
