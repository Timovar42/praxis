import type { SetLog, ExerciseLog, Session, Program, Slot } from '../types';
import { resolveVariantForEntry, resolveFamilyForSlot } from './families';

/**
 * Calculates tonnage (kg lifted) for a single set.
 * For perHand implements (dumbbells), total weight is 2x weight per hand.
 */
export function calculateSetTonnage(set: SetLog, isPerHand: boolean = false): number {
  if (!set.done || set.weight == null || set.reps == null || set.weight <= 0 || set.reps <= 0) {
    return 0;
  }
  const multiplier = isPerHand ? 2 : 1;
  return set.weight * multiplier * set.reps;
}

/**
 * Calculates total tonnage for an exercise log entry.
 */
export function calculateEntryTonnage(entry: ExerciseLog, slot?: Slot): number {
  if (entry.skipped || !entry.sets) return 0;
  const dummySlot: Slot = slot || {
    id: entry.slotId,
    lift: entry.slotId,
    name: entry.customName || entry.slotId,
    day: 'mon',
    kind: 'isolation',
    inc: 2.5,
    muscles: {},
    rx: { vol: entry.rxSnapshot, mid: entry.rxSnapshot, str: entry.rxSnapshot },
  };
  const family = resolveFamilyForSlot(dummySlot);
  const variant = resolveVariantForEntry(dummySlot, entry, family);
  const isPerHand = Boolean(variant.perHand);

  return entry.sets.reduce((total, set) => {
    return total + calculateSetTonnage(set, isPerHand);
  }, 0);
}

/**
 * Calculates total tonnage for a workout session.
 */
export function calculateSessionTonnage(session: Session, program?: Program): number {
  if (!session.entries) return 0;
  const slotMap = new Map(program?.slots.map((s) => [s.id, s]) || []);

  return session.entries.reduce((total, entry) => {
    const slot = slotMap.get(entry.slotId);
    return total + calculateEntryTonnage(entry, slot);
  }, 0);
}
