import { describe, it, expect } from 'vitest';
import { weeklyVolume } from '../domain/volume';
import { seedProgram } from '../data/seedProgram';
import type { Session } from '../domain/types';

describe('volume', () => {
  it('counts only work sets that are done', () => {
    const weekStart = new Date('2026-11-02'); // Monday

    const session: Session = {
      id: 'test-1',
      date: '2026-11-02',
      day: 'mon',
      cycle: 1,
      week: 1,
      entries: [
        {
          slotId: 'squat',
          zone: 'str',
          variant: 0,
          rxSnapshot: seedProgram.slots.find(s => s.id === 'squat')!.rx.str,
          sets: [
            { type: 'warmup', done: true },
            { type: 'work', done: true },
            { type: 'work', done: true },
            { type: 'work', done: false },
          ],
        },
      ],
    };

    const result = weeklyVolume([session], seedProgram, weekStart);
    // squat has quads: 1 and glutes: 1 — 2 done work sets
    expect(result.direct.quads).toBe(2);
    expect(result.direct.glutes).toBe(2);
    expect(result.total.quads).toBe(2);
  });

  it('skips entries marked as skipped', () => {
    const weekStart = new Date('2026-11-02');
    const session: Session = {
      id: 'test-2',
      date: '2026-11-02',
      day: 'mon',
      cycle: 1,
      week: 1,
      entries: [
        {
          slotId: 'squat',
          zone: 'str',
          variant: 0,
          rxSnapshot: seedProgram.slots.find(s => s.id === 'squat')!.rx.str,
          sets: [{ type: 'work', done: true }],
          skipped: true,
        },
      ],
    };
    const result = weeklyVolume([session], seedProgram, weekStart);
    expect(result.direct.quads).toBeUndefined();
  });

  it('excludes sessions outside the week', () => {
    const weekStart = new Date('2026-11-02');
    const session: Session = {
      id: 'test-3',
      date: '2026-11-10', // next week
      day: 'tue',
      cycle: 1,
      week: 2,
      entries: [
        {
          slotId: 'squat',
          zone: 'mid',
          variant: 0,
          rxSnapshot: seedProgram.slots.find(s => s.id === 'squat')!.rx.mid,
          sets: [{ type: 'work', done: true }],
        },
      ],
    };
    const result = weeklyVolume([session], seedProgram, weekStart);
    expect(result.direct.quads).toBeUndefined();
  });

  it('indirect muscles count towards total but not direct', () => {
    const weekStart = new Date('2026-11-04'); // Wed
    const session: Session = {
      id: 'test-4',
      date: '2026-11-04',
      day: 'wed',
      cycle: 1,
      week: 1,
      entries: [
        {
          slotId: 'bench_tue',
          zone: 'str',
          variant: 0,
          rxSnapshot: seedProgram.slots.find(s => s.id === 'bench_tue')!.rx.str,
          sets: [{ type: 'work', done: true }],
        },
      ],
    };
    const result = weeklyVolume([session], seedProgram, weekStart);
    // chest: 1 → direct
    expect(result.direct.chest).toBe(1);
    // triceps: 0.5 → not direct
    expect(result.direct.triceps).toBeUndefined();
    // but triceps total should be 0.5
    expect(result.total.triceps).toBe(0.5);
  });
});
