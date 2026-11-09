import type { Program, Session, Slot, Settings } from '../types';
import type { Bin, Estimate } from './types';
import { resolveFamilyForSlot, resolveVariantForEntry, DEFAULT_FAMILIES } from './families';
import { rebuildEstimates } from './estimate';

/**
 * Migrates a v1 Program to v2 schema by enriching all slots with
 * familyId, variants, and defaultVariant.
 */
export function migrateProgramV1toV2(program: Program): Program {
  const updatedSlots: Slot[] = (program.slots || []).map((slot) => {
    const family = resolveFamilyForSlot(slot, DEFAULT_FAMILIES);
    const variants = Object.keys(family.k);
    const defaultVariant = slot.defaultVariant || family.canonical;

    return {
      ...slot,
      familyId: slot.familyId || family.id,
      variants: slot.variants && slot.variants.length > 0 ? slot.variants : variants,
      defaultVariant,
    };
  });

  return {
    ...program,
    slots: updatedSlots,
  };
}

/**
 * Migrates v1 Sessions to v2 schema:
 * Assigns variantId to all exercise log entries based on variation string or slot default.
 * Preserves 100% of sessions, dates, sets, and notes.
 */
export function migrateSessionsV1toV2(
  sessions: Session[],
  program?: Program
): Session[] {
  const slotMap = new Map<string, Slot>();
  if (program?.slots) {
    for (const slot of program.slots) {
      slotMap.set(slot.id, slot);
    }
  }

  return (sessions || []).map((session) => {
    const updatedEntries = (session.entries || []).map((entry) => {
      if (entry.variantId) {
        return entry;
      }

      const slot = slotMap.get(entry.slotId) || {
        id: entry.slotId,
        lift: entry.slotId,
        name: entry.customName || entry.slotId,
        day: session.day,
        kind: 'isolation' as const,
        inc: 2.5,
        muscles: {},
        rx: { vol: entry.rxSnapshot, mid: entry.rxSnapshot, str: entry.rxSnapshot },
      };

      const family = resolveFamilyForSlot(slot, DEFAULT_FAMILIES);
      const resolvedVariant = resolveVariantForEntry(slot, entry, family);

      return {
        ...entry,
        variantId: resolvedVariant.id,
      };
    });

    return {
      ...session,
      entries: updatedEntries,
    };
  });
}

/**
 * Full migration runner from v1 to v2:
 * 1. Enriches program slots.
 * 2. Enriches session entries with variantId without losing any sessions.
 * 3. Rebuilds estimates cache.
 */
export function migrateAllV1toV2(
  program: Program,
  sessions: Session[],
  settings: Partial<Settings> = {}
): {
  program: Program;
  sessions: Session[];
  estimates: Record<string, Record<Bin, Estimate>>;
} {
  const v2Program = migrateProgramV1toV2(program);
  const v2Sessions = migrateSessionsV1toV2(sessions, v2Program);
  const estimates = rebuildEstimates(v2Sessions, DEFAULT_FAMILIES, settings);

  return {
    program: v2Program,
    sessions: v2Sessions,
    estimates,
  };
}
