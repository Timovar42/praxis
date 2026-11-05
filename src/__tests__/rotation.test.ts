import { describe, it, expect } from 'vitest';
import { dateToRotation } from '../domain/rotation';
import { seedProgram } from '../data/seedProgram';

const { cycleStart, cycleWeeks, rotation } = seedProgram;

describe('rotation', () => {
  it('2026-11-02 → неделя 1, пн, str', () => {
    const r = dateToRotation('2026-11-02', cycleStart, cycleWeeks, rotation);
    expect(r.week).toBe(1);
    expect(r.day).toBe('mon');
    expect(r.zone).toBe('str');
  });
  it('2026-11-04 → ср, str', () => {
    const r = dateToRotation('2026-11-04', cycleStart, cycleWeeks, rotation);
    expect(r.day).toBe('wed');
    expect(r.zone).toBe('str');
  });
  it('2026-11-06 → пт, vol', () => {
    const r = dateToRotation('2026-11-06', cycleStart, cycleWeeks, rotation);
    expect(r.day).toBe('fri');
    expect(r.zone).toBe('vol');
  });
  it('2026-11-09 → неделя 2, пн, mid', () => {
    const r = dateToRotation('2026-11-09', cycleStart, cycleWeeks, rotation);
    expect(r.week).toBe(2);
    expect(r.day).toBe('mon');
    expect(r.zone).toBe('mid');
  });
  it('2026-11-23 → неделя 1 нового цикла', () => {
    const r = dateToRotation('2026-11-23', cycleStart, cycleWeeks, rotation);
    expect(r.week).toBe(1);
    expect(r.cycle).toBe(2);
  });
});
