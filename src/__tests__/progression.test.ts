import { describe, it, expect } from 'vitest';
import { calcE1RM, referenceE1RM, suggest } from '../domain/progression';
import type { Settings } from '../domain/types';
import { seedProgram } from '../data/seedProgram';

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
});
