import { addDays, differenceInCalendarDays, parseISO, getDay, format } from 'date-fns';
import type { DayKey, Zone, Program } from './types';

export const DAY_KEY_ORDER: DayKey[] = ['mon', 'tue', 'wed', 'fri', 'sat'];

const ISO_DAY_TO_KEY: Record<number, DayKey | null> = {
  1: 'mon',
  2: 'tue',
  3: 'wed',
  5: 'fri',
  6: 'sat',
};

export function dateToRotation(
  dateStr: string,
  cycleStart: string,
  cycleWeeks: number,
  rotation: Record<DayKey, Zone[]>
): { week: number; cycle: number; day: DayKey | null; zone: Zone | null } {
  const date = parseISO(dateStr);
  const start = parseISO(cycleStart);

  // cycleStart must be a Monday
  const diffDays = differenceInCalendarDays(date, start);
  if (diffDays < 0) {
    return { week: 0, cycle: 0, day: null, zone: null };
  }

  const totalWeeks = Math.floor(diffDays / 7);
  const cycleIndex = Math.floor(totalWeeks / cycleWeeks); // 0-based
  const weekInCycle = (totalWeeks % cycleWeeks) + 1; // 1-based

  const isoDay = getDay(date); // 0=Sun,1=Mon,...,6=Sat
  const dayKey = ISO_DAY_TO_KEY[isoDay] ?? null;

  let zone: Zone | null = null;
  if (dayKey && rotation[dayKey]) {
    zone = rotation[dayKey][weekInCycle - 1] ?? null;
  }

  return {
    week: weekInCycle,
    cycle: cycleIndex + 1,
    day: dayKey,
    zone,
  };
}

export function getTrainingDates(
  program: Program,
  fromDate: string,
  count: number
): Array<{ date: string; day: DayKey; week: number; cycle: number; zone: Zone }> {
  const results: Array<{ date: string; day: DayKey; week: number; cycle: number; zone: Zone }> = [];
  const start = parseISO(fromDate);
  let cursor = 0;

  while (results.length < count) {
    const d = addDays(start, cursor);
    const dateStr = format(d, 'yyyy-MM-dd');
    const rot = dateToRotation(dateStr, program.cycleStart, program.cycleWeeks, program.rotation);
    if (rot.day && rot.zone) {
      results.push({
        date: dateStr,
        day: rot.day,
        week: rot.week,
        cycle: rot.cycle,
        zone: rot.zone,
      });
    }
    cursor++;
    if (cursor > 365 * 3) break; // safety
  }
  return results;
}
