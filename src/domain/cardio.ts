import type { UserProfile } from './types';

export interface CardioTypeOption {
  id: string;
  name: string;
  met: number;
  iconName: string;
}

export const CARDIO_TYPES: CardioTypeOption[] = [
  { id: 'treadmill_walk', name: 'Дорожка — ходьба', met: 4.3, iconName: 'Footprints' },
  { id: 'treadmill_run', name: 'Дорожка — бег', met: 9.5, iconName: 'Flame' },
  { id: 'elliptical', name: 'Эллипс', met: 7.5, iconName: 'Activity' },
  { id: 'bike', name: 'Велотренажер', met: 7.0, iconName: 'Bike' },
  { id: 'boxing', name: 'Боксирование', met: 9.0, iconName: 'ShieldAlert' },
  { id: 'jump_rope', name: 'Скакалка', met: 11.5, iconName: 'Zap' },
];

export const DEFAULT_USER_PROFILE: UserProfile = {
  gender: 'male',
  age: 18,
  height: 183, // 183 см
  weight: 92, // 91.3 - 93 кг
  bodyFatPct: 27, // +-27%
};

export function getCardioMet(kindId: string): number {
  const option = CARDIO_TYPES.find((c) => c.id === kindId);
  return option?.met ?? 5.0;
}

/**
 * Calculates estimated burned calories based on MET (Metabolic Equivalent of Task).
 * Calories = MET * weight_kg * (minutes / 60)
 */
export function calculateCardioCalories(kindId: string, minutes: number, weightKg: number): number {
  if (minutes <= 0 || weightKg <= 0) return 0;
  const met = getCardioMet(kindId);
  const cals = met * weightKg * (minutes / 60);
  return Math.round(cals);
}
