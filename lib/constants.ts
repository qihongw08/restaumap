export const APP_NAME = 'RestauMap';

export const RESTAURANT_STATUS_LABELS: Record<string, string> = {
  WANT_TO_GO: 'Want to go',
  VISITED: 'Visited',
  FAVORITE: 'Favorite',
  WARNING_ZONE: 'Warning zone',
} as const;

export const PRICE_RANGE_OPTIONS = ['$', '$$', '$$$', '$$$$'] as const;

export const PF_RATIO_FULLNESS_MAX = 10;
export const PF_RATIO_TASTE_MAX = 10;

export const BLACKLIST_REASONS = [
  { value: 'food_quality', label: 'Food quality' },
  { value: 'got_sick', label: 'Got sick' },
  { value: 'bad_service', label: 'Bad service' },
  { value: 'other', label: 'Other' },
] as const;
