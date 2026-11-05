import type { Program, Session, Settings } from './types';
import { sessionE1RM, referenceE1RM } from './progression';
import { dateToRotation, getTrainingDates } from './rotation';

/**
 * Extracts chronological e1RM history for a specific lift across all sessions.
 * Returns array sorted newest first (for referenceE1RM).
 */
export function getLiftHistory(
  sessions: Session[],
  lift: string,
  program: Program,
  formula: Settings['formula']
): Array<{ date: string; e1rm: number; badDay?: boolean; sessionId: string }> {
  // Find all slots with this lift
  const matchingSlotIds = new Set(program.slots.filter((s) => s.lift === lift).map((s) => s.id));

  // Sort sessions by date descending (newest first)
  const sortedSessions = [...sessions].sort((a, b) => b.date.localeCompare(a.date));

  const history: Array<{ date: string; e1rm: number; badDay?: boolean; sessionId: string }> = [];

  for (const session of sortedSessions) {
    // Find entries in this session for this lift
    const entries = session.entries.filter((e) => matchingSlotIds.has(e.slotId) && !e.skipped);
    let maxSessionE1rm = 0;

    for (const entry of entries) {
      const e1rm = sessionE1RM(entry.sets, entry.rpe, formula);
      if (e1rm > maxSessionE1rm) {
        maxSessionE1rm = e1rm;
      }
    }

    if (maxSessionE1rm > 0) {
      history.push({
        date: session.date,
        e1rm: maxSessionE1rm,
        badDay: session.badDay,
        sessionId: session.id,
      });
    }
  }

  return history;
}

/**
 * Calculates current reference e1RM for a lift based on past sessions.
 */
export function getCurrentLiftE1RM(
  sessions: Session[],
  lift: string,
  program: Program,
  settings: Settings
): { value: number; check: boolean } {
  const history = getLiftHistory(sessions, lift, program, settings.formula);
  if (history.length === 0) return { value: 0, check: false };

  // Calculate previous reference if more than 3 sessions
  let previousRef: number | null = null;
  if (history.length > 1) {
    const olderHistory = history.slice(1);
    previousRef = referenceE1RM(olderHistory, null).value;
  }

  return referenceE1RM(history, previousRef);
}

/**
 * Generates or retrieves the session for a given date.
 */
export function getOrCreateSessionForDate(
  sessions: Session[],
  program: Program,
  dateStr: string
): Session | null {
  const existing = sessions.find((s) => s.date === dateStr);
  if (existing) return existing;

  const rot = dateToRotation(dateStr, program.cycleStart, program.cycleWeeks, program.rotation);
  if (!rot.day || !rot.zone) return null;

  const dayKey = rot.day;
  const zone = rot.zone;

  const slotsForDay = program.slots.filter((s) => s.day === dayKey);
  const dayInfo = program.days[dayKey];

  return {
    id: `session-${dateStr}`,
    date: dateStr,
    day: dayKey,
    cycle: rot.cycle,
    week: rot.week,
    cardioDone: false,
    cardio: dayInfo?.cardio
      ? {
          kind: 'treadmill_walk',
          minutes: dayInfo.cardio.minutes,
          calories: Math.round(4.3 * 92 * (dayInfo.cardio.minutes / 60)),
          done: false,
        }
      : undefined,
    entries: slotsForDay.map((slot) => {
      const rx = slot.rx[zone];
      const defaultVariant = 0;
      const defaultOpts = rx.opts[defaultVariant] ?? [3, 8];
      const setsCount = defaultOpts[0];

      return {
        slotId: slot.id,
        zone,
        variant: defaultVariant,
        rxSnapshot: rx,
        variation: slot.variations?.[0],
        sets: Array.from({ length: setsCount }, () => ({
          type: 'work',
          done: false,
        })),
      };
    }),
  };
}

/**
 * Finds the last logged sets for a slot or lift (for "Как в прошлый раз").
 */
export function getLastLoggedSets(
  sessions: Session[],
  slotId: string,
  program: Program
): Array<{ weight?: number; reps?: number; type: any }> | null {
  const targetSlot = program.slots.find((s) => s.id === slotId);
  if (!targetSlot) return null;

  const matchingSlotIds = new Set(
    program.slots.filter((s) => s.lift === targetSlot.lift).map((s) => s.id)
  );

  const sortedSessions = [...sessions].sort((a, b) => b.date.localeCompare(a.date));

  for (const session of sortedSessions) {
    for (const entry of session.entries) {
      if (matchingSlotIds.has(entry.slotId) && !entry.skipped) {
        const doneSets = entry.sets.filter((s) => s.done && s.weight != null && s.reps != null);
        if (doneSets.length > 0) {
          return doneSets.map((s) => ({
            weight: s.weight,
            reps: s.reps,
            type: s.type,
          }));
        }
      }
    }
  }

  return null;
}

/**
 * Checks if a given date is the closest upcoming (or today) date for a specific slot.
 */
export function isNextUpcomingSessionForSlot(
  program: Program,
  slotId: string,
  targetDate: string,
  todayStr: string
): boolean {
  const slot = program.slots.find((s) => s.id === slotId);
  if (!slot) return false;

  // Search upcoming training dates starting from today
  const dates = getTrainingDates(program, todayStr, 14);
  const nextDateForDay = dates.find((d) => d.day === slot.day);

  return nextDateForDay?.date === targetDate;
}

/**
 * Fatigue check (v1.5 from PRD):
 * 1. e1RM drops 2 sessions in a row in at least 2 of the 3 main lifts (squat, bench, deadlift)
 * 2. OR actual RPE > target RPE by >= 1 in last 3 sessions
 */
export function checkFatigueBanner(
  sessions: Session[],
  program: Program,
  settings: Settings
): { show: boolean; reason?: string } {
  if (sessions.length < 3) return { show: false };

  const baseLifts = ['squat', 'bench', 'deadlift'];
  let droppingLiftsCount = 0;

  for (const lift of baseLifts) {
    const history = getLiftHistory(sessions, lift, program, settings.formula);
    if (history.length >= 3) {
      // history[0] is newest, history[1] older, history[2] oldest
      if (history[0].e1rm < history[1].e1rm && history[1].e1rm < history[2].e1rm) {
        droppingLiftsCount++;
      }
    }
  }

  if (droppingLiftsCount >= 2) {
    return {
      show: true,
      reason: 'Опорный e1RM снижается 2 тренировки подряд в базовых движениях.',
    };
  }

  // Check RPE in last 3 sessions
  const sortedSessions = [...sessions].sort((a, b) => b.date.localeCompare(a.date));
  let highRpeSessions = 0;

  for (let i = 0; i < Math.min(sortedSessions.length, 3); i++) {
    const s = sortedSessions[i];
    let sessionHighRpe = false;
    for (const entry of s.entries) {
      if (entry.skipped || !entry.rpe) continue;
      const targetMid = entry.rxSnapshot.rpe
        ? (entry.rxSnapshot.rpe[0] + entry.rxSnapshot.rpe[1]) / 2
        : 8;
      if (entry.rpe >= targetMid + 1) {
        sessionHighRpe = true;
        break;
      }
    }
    if (sessionHighRpe) highRpeSessions++;
  }

  if (highRpeSessions >= 3) {
    return {
      show: true,
      reason: 'Фактический RPE превышает целевой на 1+ в последних 3 тренировках.',
    };
  }

  return { show: false };
}
