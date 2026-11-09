import { describe, it, expect } from 'vitest';
import { calcE1RM, referenceE1RM, suggest, sessionE1RM } from '../domain/progression';
import type { Settings, SetLog } from '../domain/types';
import { seedProgram } from '../data/seedProgram';
import { EXERCISE_VARIATIONS } from '../domain/exerciseVariations';
import { getOrCreateSessionForDate } from '../domain/workoutHelper';

const defaultSettings: Settings = { rpeMode: 'mid', formula: 'epley', units: 'kg' };

describe('progression', () => {
  it('e1RM(100, 8, 8) = 133.33', () => {
    expect(calcE1RM(100, 8, 8)).toBeCloseTo(133.33, 1);
  });

  it('suggest str 3x3 RPE 8-9 (mid 8.5), cap 0.90, e1RM 133.33 → 115', () => {
    const rx = { opts: [[3, 3]] as [number, number][], rpe: [8, 9] as [number, number], cap: 0.90 };
    const result = suggest(
      { kind: 'main', inc: 2.5 },
      'str',
      0,
      rx as any,
      133.33,
      defaultSettings
    );
    expect(result?.weight).toBe(115);
  });

  it('suggest vol 4x8 RPE 7, cap 0.70, e1RM 133.33 → 92.5 (cap, округление вниз)', () => {
    const rx = { opts: [[4, 8]] as [number, number][], rpe: [7, 7] as [number, number], cap: 0.70 };
    const result = suggest(
      { kind: 'main', inc: 2.5 },
      'vol',
      0,
      rx as any,
      133.33,
      defaultSettings
    );
    expect(result?.weight).toBe(92.5);
    expect(result?.cappedDown).toBe(true);
  });

  it('referenceE1RM срез +5% и флаг check', () => {
    const r = referenceE1RM([{ e1rm: 150 }], 100);
    expect(r.check).toBe(true);
    expect(r.value).toBeCloseTo(105, 1);
  });

  it('bench_tue и bench_sat делят lift "bench"', () => {
    const benchSlots = seedProgram.slots.filter((s) => s.lift === 'bench');
    expect(benchSlots.length).toBe(2);
    expect(benchSlots.map((s) => s.id).sort()).toEqual(['bench_sat', 'bench_tue']);
  });

  it('sessionE1RM отдаёт приоритет индивидуальному RPE подхода (set.rpe)', () => {
    const sets: SetLog[] = [
      { weight: 100, reps: 5, rpe: 10, type: 'work', done: true }, // calc: 100*(1+5/30) = 116.67
      { weight: 100, reps: 5, rpe: 8, type: 'work', done: true },  // calc: 100*(1+7/30) = 123.33
    ];
    // With exerciseRpe = 7, but second set has s.rpe = 8 and first has 10
    const e1rm = sessionE1RM(sets, 7, 'epley');
    expect(e1rm).toBeCloseTo(123.33, 1);
  });

  it('EXERCISE_VARIATIONS.side_delt содержит "Шраги со штангой"', () => {
    expect(EXERCISE_VARIATIONS.side_delt).toContain('Шраги со штангой');
    expect(EXERCISE_VARIATIONS.sdelts).toContain('Шраги со штангой');
  });

  it('getOrCreateSessionForDate копирует superset из slot или сохраняет существующий', () => {
    const testSlot = {
      ...seedProgram.slots[0],
      id: 'test_superset_slot',
      superset: true,
    };
    const testProgram = {
      ...seedProgram,
      slots: [testSlot],
    };
    // seedProgram cycleStart is 2026-04-06 (Monday). Tuesday is 2026-04-07.
    // If slot day matches rotation day, it creates the session entry with superset: true.
    const tuesdayDate = '2026-11-03'; // Tue (after cycleStart 2026-11-02)
    const matchingSlot = { ...testSlot, day: 'tue' as const };
    const programWithMatchingSlot = { ...testProgram, slots: [matchingSlot] };

    const session = getOrCreateSessionForDate([], programWithMatchingSlot, tuesdayDate);
    const entry = session?.entries.find((e) => e.slotId === 'test_superset_slot');
    expect(entry?.superset).toBe(true);
  });
});
