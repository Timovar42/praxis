import type { Session, Program, Muscle } from './types';
import { endOfWeek, startOfWeek, parseISO, isWithinInterval, startOfDay, endOfDay } from 'date-fns';

export interface VolumeResult {
  direct: Partial<Record<Muscle, number>>;
  total: Partial<Record<Muscle, number>>; // includes indirect
}

export function weeklyVolume(
  sessions: Session[],
  program: Program,
  weekStartDate: Date | string
): VolumeResult {
  const baseDate = typeof weekStartDate === 'string' ? parseISO(weekStartDate) : weekStartDate;
  const weekStart = startOfDay(startOfWeek(baseDate, { weekStartsOn: 1 }));
  const weekEnd = endOfDay(endOfWeek(baseDate, { weekStartsOn: 1 }));

  const direct: Partial<Record<Muscle, number>> = {};
  const total: Partial<Record<Muscle, number>> = {};

  for (const session of sessions) {
    const sessionDate = parseISO(session.date);
    if (!isWithinInterval(sessionDate, { start: weekStart, end: weekEnd })) continue;

    for (const entry of session.entries) {
      if (entry.skipped) continue;
      const slot = program.slots.find((s) => s.id === entry.slotId);
      if (!slot) continue;
      if (slot.countsInVolume === false) continue;

      // Count work sets only (not warmup sets)
      const workSets = entry.sets.filter((s) => s.type === 'work' && s.done);
      const setCount = workSets.length;
      if (setCount === 0) continue;

      for (const [muscle, coeff] of Object.entries(slot.muscles) as [Muscle, number][]) {
        total[muscle] = (total[muscle] ?? 0) + setCount * coeff;
        if (coeff === 1) {
          direct[muscle] = (direct[muscle] ?? 0) + setCount;
        }
      }
    }
  }

  return { direct, total };
}
