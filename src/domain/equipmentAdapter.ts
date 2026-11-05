import type { Session, Program, Settings } from './types';
import { sessionE1RM, referenceE1RM } from './progression';

export type EquipmentCategory =
  | 'barbell'
  | 'dumbbell'
  | 'leg_press'
  | 'hack'
  | 'smith'
  | 'hammer_machine'
  | 'cable_two_hands'
  | 'cable_one_hand'
  | 'single_dumbbell_two_hands'
  | 'unknown';

/**
 * Classifies an equipment variation string into a mechanical category
 */
export function classifyEquipment(variation?: string): EquipmentCategory {
  if (!variation) return 'unknown';
  const v = variation.toLowerCase().trim();

  // Dumbbell variations
  if (v.includes('1 гантель') || v.includes('1 гантелью') || v.includes('с 1 гантелью')) {
    return 'single_dumbbell_two_hands';
  }
  if (v.includes('гантел')) {
    return 'dumbbell';
  }

  // Leg Press & Hack Squat
  if (v.includes('жим ног') || v.includes('платформ')) {
    return 'leg_press';
  }
  if (v.includes('гакк')) {
    return 'hack';
  }

  // Barbell variations
  if (v.includes('штангой') || v.includes('гриф') || v.includes('т-гриф')) {
    return 'barbell';
  }

  // Smith Machine & Hammer levers
  if (v.includes('смитт')) {
    return 'smith';
  }
  if (v.includes('хаммер') || v.includes('рычажн')) {
    return 'hammer_machine';
  }

  // Cables
  if (v.includes('1 рукой') || v.includes('одной рукой') || v.includes('поочередно')) {
    return 'cable_one_hand';
  }
  if (v.includes('кроссовер') || v.includes('блок') || v.includes('косичк') || v.includes('рукоятк')) {
    return 'cable_two_hands';
  }

  return 'unknown';
}

/**
 * Calculates conversion ratio between two equipment variations for a specific lift type
 */
export function getEquipmentConversionFactor(
  fromVariation?: string,
  toVariation?: string,
  liftType?: string
): number {
  if (!fromVariation || !toVariation) return 1.0;
  if (fromVariation.trim().toLowerCase() === toVariation.trim().toLowerCase()) return 1.0;

  const fromCat = classifyEquipment(fromVariation);
  const toCat = classifyEquipment(toVariation);
  if (fromCat === toCat) return 1.0;

  const lift = (liftType || '').toLowerCase();

  // 1. Arm curls / Biceps / Hammers (curl, hammer, bb_curl)
  if (lift.includes('curl') || lift.includes('hammer') || lift.includes('бицепс') || lift.includes('молот')) {
    // Dumbbells (weight per hand) to Barbell (total bar weight)
    if (fromCat === 'dumbbell' && toCat === 'barbell') return 2.2; // 16 kg DBs -> ~35 kg Barbell
    if (fromCat === 'barbell' && toCat === 'dumbbell') return 1 / 2.2; // 35 kg Barbell -> 16 kg DBs

    // Dumbbells to 1-hand cable
    if (fromCat === 'dumbbell' && toCat === 'cable_one_hand') return 0.9;
    if (fromCat === 'cable_one_hand' && toCat === 'dumbbell') return 1 / 0.9;

    // Dumbbells to 2-hand cable
    if (fromCat === 'dumbbell' && toCat === 'cable_two_hands') return 1.8;
    if (fromCat === 'cable_two_hands' && toCat === 'dumbbell') return 1 / 1.8;

    // Barbell to 2-hand cable
    if (fromCat === 'barbell' && toCat === 'cable_two_hands') return 0.85;
    if (fromCat === 'cable_two_hands' && toCat === 'barbell') return 1 / 0.85;
  }

  // 2. Chest & Shoulder Presses (bench, incline, ohp, жим)
  if (lift.includes('bench') || lift.includes('incline') || lift.includes('ohp') || lift.includes('жим')) {
    // Squat family is handled separately below
    if (!lift.includes('squat') && !lift.includes('ног') && !lift.includes('присед')) {
      // Dumbbells (per hand) to Barbell
      if (fromCat === 'dumbbell' && toCat === 'barbell') return 2.4; // 30 kg DBs -> 72.5 kg Barbell
      if (fromCat === 'barbell' && toCat === 'dumbbell') return 1 / 2.4; // 72.5 kg Barbell -> 30 kg DBs

      // Barbell to Smith
      if (fromCat === 'barbell' && toCat === 'smith') return 1.08;
      if (fromCat === 'smith' && toCat === 'barbell') return 1 / 1.08;

      // Barbell to Hammer
      if (fromCat === 'barbell' && toCat === 'hammer_machine') return 1.15;
      if (fromCat === 'hammer_machine' && toCat === 'barbell') return 1 / 1.15;

      // Dumbbells to Smith
      if (fromCat === 'dumbbell' && toCat === 'smith') return 2.4 * 1.08;
      if (fromCat === 'smith' && toCat === 'dumbbell') return 1 / (2.4 * 1.08);

      // Dumbbells to Hammer
      if (fromCat === 'dumbbell' && toCat === 'hammer_machine') return 2.4 * 1.15;
      if (fromCat === 'hammer_machine' && toCat === 'dumbbell') return 1 / (2.4 * 1.15);
    }
  }

  // 3. Squat & Leg Press family (squat, legpress, присед)
  if (lift.includes('squat') || lift.includes('leg') || lift.includes('присед') || lift.includes('ног')) {
    // Barbell Squat to 45° Leg Press
    if (fromCat === 'barbell' && toCat === 'leg_press') return 1.8; // 100 kg squat -> 180 kg leg press
    if (fromCat === 'leg_press' && toCat === 'barbell') return 1 / 1.8;

    // Barbell Squat to Hack Squat
    if (fromCat === 'barbell' && toCat === 'hack') return 1.25; // 100 kg squat -> 125 kg hack
    if (fromCat === 'hack' && toCat === 'barbell') return 1 / 1.25;

    // Hack Squat to Leg Press
    if (fromCat === 'hack' && toCat === 'leg_press') return 1.8 / 1.25;
    if (fromCat === 'leg_press' && toCat === 'hack') return 1.25 / 1.8;
  }

  // 4. Rows (tbar, trow, cable_row, тяга)
  if (lift.includes('tbar') || lift.includes('row') || lift.includes('тяга')) {
    // Barbell row to T-bar
    if (fromCat === 'barbell' && toCat === 'barbell') return 1.0;
    if (fromCat === 'barbell' && toCat === 'cable_two_hands') return 0.95;
    if (fromCat === 'cable_two_hands' && toCat === 'barbell') return 1 / 0.95;
  }

  // 5. Overhead Triceps & Lateral Delts
  if (fromCat === 'single_dumbbell_two_hands' && toCat === 'dumbbell') {
    return 0.5; // 32 kg 1 dumbbell with 2 hands -> 16 kg per dumbbell
  }
  if (fromCat === 'dumbbell' && toCat === 'single_dumbbell_two_hands') {
    return 2.0; // 16 kg per dumbbell -> 32 kg 1 dumbbell
  }

  if (fromCat === 'cable_two_hands' && toCat === 'cable_one_hand') {
    return 0.5;
  }
  if (fromCat === 'cable_one_hand' && toCat === 'cable_two_hands') {
    return 2.0;
  }

  // Generic fallback if dumbbell <-> barbell
  if (fromCat === 'dumbbell' && toCat === 'barbell') return 2.2;
  if (fromCat === 'barbell' && toCat === 'dumbbell') return 1 / 2.2;

  return 1.0;
}

export interface AdaptedHistoryResult {
  sets: Array<{ weight?: number; reps?: number; type: any }>;
  sourceVariation?: string;
  targetVariation: string;
  isExactMatch: boolean;
  adapted: boolean;
  factor: number;
}

/**
 * Retrieves last logged sets for a slot, prioritizing exact matching variation.
 * If user switched variation, adapts the weight based on biomechanical implement ratios.
 */
export function getLastLoggedSetsForVariation(
  sessions: Session[],
  slotId: string,
  targetVariation: string,
  program: Program
): AdaptedHistoryResult | null {
  const targetSlot = program.slots.find((s) => s.id === slotId);
  if (!targetSlot) return null;

  const matchingSlotIds = new Set(
    program.slots.filter((s) => s.lift === targetSlot.lift).map((s) => s.id)
  );

  const sortedSessions = [...sessions].sort((a, b) => b.date.localeCompare(a.date));
  const normTarget = (targetVariation || '').trim().toLowerCase();

  // Pass 1: Look for exact matching variation in past sessions
  for (const session of sortedSessions) {
    for (const entry of session.entries) {
      if (matchingSlotIds.has(entry.slotId) && !entry.skipped) {
        const entryVar = (entry.variation || '').trim().toLowerCase();
        if (normTarget && entryVar && entryVar === normTarget) {
          const doneSets = entry.sets.filter((s) => s.done && s.weight != null && s.reps != null);
          if (doneSets.length > 0) {
            return {
              sets: doneSets.map((s) => ({ weight: s.weight, reps: s.reps, type: s.type })),
              sourceVariation: entry.variation,
              targetVariation,
              isExactMatch: true,
              adapted: false,
              factor: 1.0,
            };
          }
        }
      }
    }
  }

  // Pass 2: If no exact variation found, take the most recent variation and adapt weight!
  for (const session of sortedSessions) {
    for (const entry of session.entries) {
      if (matchingSlotIds.has(entry.slotId) && !entry.skipped) {
        const doneSets = entry.sets.filter((s) => s.done && s.weight != null && s.reps != null);
        if (doneSets.length > 0) {
          const srcVar = entry.variation || '';
          const factor = getEquipmentConversionFactor(srcVar, targetVariation, targetSlot.lift);

          const adaptedSets = doneSets.map((s) => {
            if (s.weight == null) return { ...s };
            // Adapt weight and round to slot.inc
            const raw = s.weight * factor;
            const inc = targetSlot.inc || 2.5;
            const rounded = Math.round(raw / inc) * inc;
            return {
              weight: rounded,
              reps: s.reps,
              type: s.type,
            };
          });

          return {
            sets: adaptedSets,
            sourceVariation: srcVar,
            targetVariation,
            isExactMatch: false,
            adapted: Math.abs(factor - 1.0) > 0.01,
            factor,
          };
        }
      }
    }
  }

  return null;
}

/**
 * Calculates current reference e1RM for a lift adapted to the current target variation
 */
export function getCurrentLiftE1RMForVariation(
  sessions: Session[],
  slotId: string,
  targetVariation: string,
  program: Program,
  settings: Settings
): { value: number; check: boolean; adaptedFrom?: string; factor: number } {
  const targetSlot = program.slots.find((s) => s.id === slotId);
  if (!targetSlot) return { value: 0, check: false, factor: 1.0 };

  const matchingSlotIds = new Set(
    program.slots.filter((s) => s.lift === targetSlot.lift).map((s) => s.id)
  );

  const sortedSessions = [...sessions].sort((a, b) => b.date.localeCompare(a.date));
  const normTarget = (targetVariation || '').trim().toLowerCase();

  // 1. Check if we have history with the EXACT variation
  const exactHistory: Array<{ date: string; e1rm: number; badDay?: boolean }> = [];
  for (const session of sortedSessions) {
    const entries = session.entries.filter(
      (e) =>
        matchingSlotIds.has(e.slotId) &&
        !e.skipped &&
        (e.variation || '').trim().toLowerCase() === normTarget
    );
    let maxSessionE1rm = 0;
    for (const entry of entries) {
      const e1rm = sessionE1RM(entry.sets, entry.rpe, settings.formula);
      if (e1rm > maxSessionE1rm) maxSessionE1rm = e1rm;
    }
    if (maxSessionE1rm > 0) {
      exactHistory.push({
        date: session.date,
        e1rm: maxSessionE1rm,
        badDay: session.badDay,
      });
    }
  }

  if (exactHistory.length > 0) {
    let previousRef: number | null = null;
    if (exactHistory.length > 1) {
      previousRef = referenceE1RM(exactHistory.slice(1), null).value;
    }
    const ref = referenceE1RM(exactHistory, previousRef);
    return { value: ref.value, check: ref.check, factor: 1.0 };
  }

  // 2. If no exact history, get recent history for ANY variation of this lift and apply conversion factor
  const anyHistory: Array<{ date: string; e1rm: number; badDay?: boolean }> = [];
  let detectedSourceVariation: string | undefined;

  for (const session of sortedSessions) {
    const entries = session.entries.filter((e) => matchingSlotIds.has(e.slotId) && !e.skipped);
    let maxSessionE1rm = 0;
    for (const entry of entries) {
      if (!detectedSourceVariation && entry.variation) {
        detectedSourceVariation = entry.variation;
      }
      const e1rm = sessionE1RM(entry.sets, entry.rpe, settings.formula);
      if (e1rm > maxSessionE1rm) maxSessionE1rm = e1rm;
    }
    if (maxSessionE1rm > 0) {
      anyHistory.push({
        date: session.date,
        e1rm: maxSessionE1rm,
        badDay: session.badDay,
      });
    }
  }

  if (anyHistory.length === 0) return { value: 0, check: false, factor: 1.0 };

  let previousRef: number | null = null;
  if (anyHistory.length > 1) {
    previousRef = referenceE1RM(anyHistory.slice(1), null).value;
  }
  const baseRef = referenceE1RM(anyHistory, previousRef);
  const factor = getEquipmentConversionFactor(detectedSourceVariation, targetVariation, targetSlot.lift);
  const adaptedVal = baseRef.value * factor;

  return {
    value: adaptedVal,
    check: baseRef.check,
    adaptedFrom: detectedSourceVariation,
    factor,
  };
}
