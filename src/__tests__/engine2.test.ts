import { describe, it, expect } from 'vitest';
import { pct } from '../domain/engine2/pct';
import {
  calculateSetZ,
  calculateSessionObservation,
  kalmanUpdate,
  rebuildEstimates,
  calculateTrend,
  getCalibratedE1RM,
} from '../domain/engine2/estimate';
import { DEFAULT_FAMILIES, DEFAULT_VARIANTS } from '../domain/engine2/families';
import { migrateAllV1toV2 } from '../domain/engine2/migration';
import type { Session, Program, Slot, ExerciseLog } from '../domain/types';

describe('Engine v2: Оценка силы и модель данных', () => {
  describe('2.1 Таблица pct(n) и интерполяция', () => {
    it('pct(8) = 0.786', () => {
      expect(pct(8)).toBe(0.786);
    });

    it('pct(5) = 0.863', () => {
      expect(pct(5)).toBe(0.863);
    });

    it('pct(12) = 0.680', () => {
      expect(pct(12)).toBe(0.68);
    });

    it('pct(15) ≈ 0.6347', () => {
      expect(pct(15)).toBeCloseTo(0.6347, 4);
    });

    it('pct(4.5) = 0.8775', () => {
      expect(pct(4.5)).toBeCloseTo(0.8775, 4);
    });

    it('pct(1) = 1.000 и pct(0) = 1.000', () => {
      expect(pct(1)).toBe(1.0);
      expect(pct(0)).toBe(1.0);
    });

    it('Формулы Эпли и Бжицки работают как опции', () => {
      expect(pct(10, 'epley')).toBeCloseTo(1 / (1 + 10 / 30), 4);
      expect(pct(10, 'brzycki')).toBeCloseTo((37 - 10) / 36, 4);
    });
  });

  describe('2.2 Наблюдение подхода (z)', () => {
    it('z для 100 кг x 8 при RPE 8 (n = 10) равен 135.3', () => {
      const family = DEFAULT_FAMILIES.bench;
      const variant = DEFAULT_VARIANTS.bench_barbell; // canonical, k = 1.0
      const dummyEntry: ExerciseLog = {
        slotId: 'bench',
        zone: 'mid',
        variant: 0,
        rxSnapshot: { opts: [[3, 8]] },
        sets: [],
      };

      const obs = calculateSetZ(100, 8, 8, dummyEntry, variant, family);
      expect(obs).not.toBeNull();
      expect(obs?.n).toBe(10);
      expect(obs?.z).toBeCloseTo(135.3, 1);
    });

    it('canonicalLoad переводит вес со снаряда с коэффициентом k', () => {
      const family = DEFAULT_FAMILIES.bench;
      const dbVariant = DEFAULT_VARIANTS.bench_dumbbell; // k = 0.36
      const dummyEntry: ExerciseLog = {
        slotId: 'bench',
        zone: 'mid',
        variant: 0,
        rxSnapshot: { opts: [[3, 8]] },
        sets: [],
      };

      // 36 кг гантели x 8 @ RPE 8 => canonicalLoad = 36 / 0.36 = 100 кг => z = 135.3
      const obs = calculateSetZ(36, 8, 8, dummyEntry, dbVariant, family);
      expect(obs).not.toBeNull();
      expect(obs?.z).toBeCloseTo(135.3, 1);
    });
  });

  describe('2.3 Наблюдение сессии', () => {
    it('z_session берёт среднее двух лучших рабочих подходов', () => {
      const family = DEFAULT_FAMILIES.bench;
      const slot: Slot = {
        id: 'bench',
        lift: 'bench',
        name: 'Жим лёжа',
        day: 'tue',
        kind: 'main',
        inc: 2.5,
        muscles: { chest: 1 },
        rx: {
          vol: { opts: [[4, 8]] },
          mid: { opts: [[4, 8]] },
          str: { opts: [[4, 8]] },
        },
      };

      const entry: ExerciseLog = {
        slotId: 'bench',
        zone: 'mid',
        variant: 0,
        rxSnapshot: { opts: [[4, 8]] },
        sets: [
          { type: 'warmup', done: true, weight: 60, reps: 8, rpe: 6 },
          { type: 'work', done: true, weight: 100, reps: 8, rpe: 8 }, // z ~ 135.3
          { type: 'work', done: true, weight: 102.5, reps: 8, rpe: 8 }, // z ~ 138.7
          { type: 'work', done: true, weight: 95, reps: 8, rpe: 8 },
        ],
      };

      const sessionObs = calculateSessionObservation(entry, slot, family);
      expect(sessionObs).not.toBeNull();
      // Average of 138.70 and 135.318 => ~137.0
      expect(sessionObs?.zSession).toBeCloseTo(137.0, 1);
      expect(sessionObs?.bin).toBe('mid');
    });
  });

  describe('2.4 Фильтр Калмана 1D', () => {
    it('Калман: истинный e1RM 130, 10 наблюдений с шумом ±3%, итог в пределах 2%, sd уменьшается; выброс +15% ограничивается и ставит флаг "check"', () => {
      const trueE1rm = 130;
      const noise = [0.01, -0.02, 0.02, -0.01, 0.015, -0.025, 0.005, -0.015, 0.02, -0.005];

      // Step 1: Initial observation at week 0
      const initResult = kalmanUpdate(
        null,
        {
          z: trueE1rm * (1 + noise[0]),
          n: 5,
          rpe: 9,
          rpeImputed: false,
          implement: 'barbell',
          conf: 'high',
          date: '2026-11-02',
        },
        {},
        'set'
      );

      let estimate = initResult.updated;
      const initialSd = Math.sqrt(estimate.p);

      const dates = [
        '2026-11-09',
        '2026-11-16',
        '2026-11-23',
        '2026-11-30',
        '2026-12-07',
        '2026-12-14',
        '2026-12-21',
        '2026-12-28',
        '2027-01-04',
      ];

      // Step 2: Feed 9 more observations with ±3% noise
      for (let i = 1; i < 10; i++) {
        const dateStr = dates[i - 1];
        const zObs = trueE1rm * (1 + noise[i]);
        const step = kalmanUpdate(estimate, {
          z: zObs,
          n: 5,
          rpe: 9,
          rpeImputed: false,
          implement: 'barbell',
          conf: 'high',
          date: dateStr,
        });
        estimate = step.updated;
      }

      // Check: final mu is within 2% of 130
      const relativeError = Math.abs(estimate.mu - trueE1rm) / trueE1rm;
      expect(relativeError).toBeLessThan(0.02);

      // Check: standard deviation decreased compared to initial
      const finalSd = Math.sqrt(estimate.p);
      expect(finalSd).toBeLessThan(initialSd);

      // Step 3: Outlier test (+15% spike)
      const outlierZ = trueE1rm * 1.15; // 149.5 kg
      const outlierStep = kalmanUpdate(estimate, {
        z: outlierZ,
        n: 5,
        rpe: 9,
        rpeImputed: false,
        implement: 'barbell',
        conf: 'high',
        date: '2027-01-11',
      });

      expect(outlierStep.check).toBe(true);
      // Effective estimate should be bounded and significantly less than 149.5
      expect(outlierStep.updated.mu).toBeLessThan(outlierZ);
    });
  });

  describe('2.5 Личная калибровка диапазонов и 2.6 Тренд', () => {
    it('Тренд определяет "растёт", "держится", "падает"', () => {
      // 1. Growing trend: 100 -> 105 over 4 weeks (> 0.3%/week)
      const growingEst: any = {
        familyId: 'bench',
        bin: 'all',
        mu: 105,
        p: 4,
        n: 5,
        updatedAt: '2026-11-30',
        hist: [
          { date: '2026-11-02', mu: 100, sd: 5 },
          { date: '2026-11-09', mu: 101.5, sd: 4.5 },
          { date: '2026-11-16', mu: 103, sd: 4 },
          { date: '2026-11-23', mu: 104, sd: 3.5 },
          { date: '2026-11-30', mu: 105, sd: 3 },
        ],
      };
      expect(calculateTrend(growingEst)).toBe('растёт');

      // 2. Stable trend: 100 -> 100.1
      const stableEst: any = {
        ...growingEst,
        mu: 100.1,
        hist: [
          { date: '2026-11-02', mu: 100, sd: 5 },
          { date: '2026-11-09', mu: 100, sd: 4.5 },
          { date: '2026-11-16', mu: 100.2, sd: 4 },
          { date: '2026-11-23', mu: 99.9, sd: 3.5 },
          { date: '2026-11-30', mu: 100.1, sd: 3 },
        ],
      };
      expect(calculateTrend(stableEst)).toBe('держится');
    });

    it('Калибровка диапазонов использует mu_bin при n >= 3, иначе bias', () => {
      const estimates: any = {
        all: { familyId: 'bench', bin: 'all', mu: 100, p: 4, n: 5, hist: [] },
        low: { familyId: 'bench', bin: 'low', mu: 108, p: 4, n: 3, hist: [] },
        mid: { familyId: 'bench', bin: 'mid', mu: 98, p: 4, n: 2, hist: [] },
        high: { familyId: 'bench', bin: 'high', mu: 0, p: 0, n: 0, hist: [] },
      };

      // For 3 reps (low bin, n=3): uses mu_bin (108)
      const resLow = getCalibratedE1RM(3, estimates);
      expect(resLow.e1rm).toBe(108);
      expect(resLow.sourceBin).toBe('low');

      // For 8 reps (mid bin, n=2 < 3): uses all * exp(bias)
      const resMid = getCalibratedE1RM(8, estimates, { low: 0, mid: 0.05, high: 0 });
      expect(resMid.e1rm).toBeCloseTo(100 * Math.exp(0.05), 1);
      expect(resMid.sourceBin).toBe('all');
    });
  });

  describe('rebuildEstimates & Идемпотентность', () => {
    const sampleSessions: Session[] = [
      {
        id: 's1',
        date: '2026-11-03',
        day: 'tue',
        cycle: 1,
        week: 1,
        entries: [
          {
            slotId: 'bench',
            zone: 'mid',
            variant: 0,
            rxSnapshot: { opts: [[3, 8]] },
            sets: [
              { type: 'work', done: true, weight: 100, reps: 8, rpe: 8 },
              { type: 'work', done: true, weight: 100, reps: 8, rpe: 8.5 },
            ],
          },
        ],
      },
      {
        id: 's2',
        date: '2026-11-10',
        day: 'tue',
        cycle: 1,
        week: 2,
        entries: [
          {
            slotId: 'bench',
            zone: 'vol',
            variant: 0,
            rxSnapshot: { opts: [[4, 10]] },
            sets: [
              { type: 'work', done: true, weight: 95, reps: 10, rpe: 8 },
              { type: 'work', done: true, weight: 95, reps: 10, rpe: 8.5 },
            ],
          },
        ],
      },
    ];

    it('rebuildEstimates идемпотентна (два вызова дают одинаковый результат)', () => {
      const est1 = rebuildEstimates(sampleSessions, DEFAULT_FAMILIES);
      const est2 = rebuildEstimates(sampleSessions, DEFAULT_FAMILIES);

      expect(est1).toEqual(est2);
      expect(est1.bench).toBeDefined();
      expect(est1.bench.all.n).toBe(2);
      expect(est1.bench.mid.n).toBe(2);
    });

    it('сессия с badDay не меняет estimates', () => {
      const baseEstimates = rebuildEstimates(sampleSessions, DEFAULT_FAMILIES);

      const badDaySession: Session = {
        id: 's3-bad',
        date: '2026-11-17',
        day: 'tue',
        cycle: 1,
        week: 3,
        badDay: true, // Marked bad day
        entries: [
          {
            slotId: 'bench',
            zone: 'str',
            variant: 0,
            rxSnapshot: { opts: [[3, 3]] },
            sets: [{ type: 'work', done: true, weight: 60, reps: 3, rpe: 10 }],
          },
        ],
      };

      const withBadDayEstimates = rebuildEstimates([...sampleSessions, badDaySession], DEFAULT_FAMILIES);

      expect(withBadDayEstimates).toEqual(baseEstimates);
    });
  });

  describe('Миграция v1 → v2', () => {
    it('Миграция v1 → v2 не теряет ни одной сессии', () => {
      const v1Program: Program = {
        id: 'prog-v1',
        name: 'Praxis Legacy v1',
        cycleStart: '2026-11-02',
        cycleWeeks: 3,
        rotation: {
          mon: ['str', 'mid', 'vol'],
          tue: ['mid', 'vol', 'str'],
          wed: ['str', 'mid', 'vol'],
          fri: ['vol', 'str', 'mid'],
          sat: ['vol', 'vol', 'mid'],
        },
        days: {
          mon: { title: 'День 1' },
          tue: { title: 'День 2' },
          wed: { title: 'День 3' },
          fri: { title: 'День 4' },
          sat: { title: 'День 5' },
        },
        slots: [
          {
            id: 'bench',
            lift: 'bench',
            name: 'Жим лёжа',
            day: 'tue',
            kind: 'main',
            inc: 2.5,
            muscles: { chest: 1 },
            rx: { vol: { opts: [[3, 8]] }, mid: { opts: [[3, 8]] }, str: { opts: [[3, 8]] } },
            variations: ['Со штангой', 'С гантелями'],
          },
          {
            id: 'tri_ext',
            lift: 'tri_ext',
            name: 'Разгибания рук из-за головы',
            day: 'wed',
            kind: 'isolation',
            inc: 2.0,
            muscles: { triceps: 1 },
            rx: { vol: { opts: [[3, 12]] }, mid: { opts: [[3, 12]] }, str: { opts: [[3, 12]] } },
          },
        ],
      };

      const v1Sessions: Session[] = [
        {
          id: 'v1-session-1',
          date: '2026-11-03',
          day: 'tue',
          cycle: 1,
          week: 1,
          entries: [
            {
              slotId: 'bench',
              zone: 'mid',
              variant: 0,
              variation: 'Со штангой',
              rxSnapshot: { opts: [[3, 8]] },
              sets: [{ type: 'work', done: true, weight: 100, reps: 8, rpe: 8 }],
            },
          ],
        },
        {
          id: 'v1-session-2',
          date: '2026-11-04',
          day: 'wed',
          cycle: 1,
          week: 1,
          entries: [
            {
              slotId: 'tri_ext',
              zone: 'vol',
              variant: 0,
              rxSnapshot: { opts: [[3, 12]] },
              sets: [{ type: 'work', done: true, weight: 16, reps: 12, rpe: 8 }],
            },
          ],
        },
        {
          id: 'v1-session-3',
          date: '2026-11-10',
          day: 'tue',
          cycle: 1,
          week: 2,
          entries: [
            {
              slotId: 'bench',
              zone: 'vol',
              variant: 0,
              variation: 'С гантелями',
              rxSnapshot: { opts: [[3, 10]] },
              sets: [{ type: 'work', done: true, weight: 34, reps: 10, rpe: 8.5 }],
            },
          ],
        },
      ];

      const { program: v2Prog, sessions: v2Sessions, estimates } = migrateAllV1toV2(v1Program, v1Sessions);

      // 1. No sessions lost!
      expect(v2Sessions.length).toBe(v1Sessions.length);
      expect(v2Sessions.map((s) => s.id)).toEqual(['v1-session-1', 'v1-session-2', 'v1-session-3']);

      // 2. Program slots enriched with familyId, variants, defaultVariant
      const benchSlot = v2Prog.slots.find((s) => s.id === 'bench');
      expect(benchSlot?.familyId).toBe('bench');
      expect(benchSlot?.defaultVariant).toBe('bench_barbell');
      expect(benchSlot?.variants).toContain('bench_barbell');

      const triSlot = v2Prog.slots.find((s) => s.id === 'tri_ext');
      expect(triSlot?.familyId).toBe('tri_ext');
      expect(triSlot?.defaultVariant).toBe('tri_ext_db_1h'); // dumbbell per default

      // 3. Entries have variantId resolved
      expect(v2Sessions[0].entries[0].variantId).toBe('bench_barbell');
      expect(v2Sessions[1].entries[0].variantId).toBe('tri_ext_db_1h');
      expect(v2Sessions[2].entries[0].variantId).toBe('bench_dumbbell');

      // 4. Estimates cache successfully populated
      expect(estimates.bench).toBeDefined();
      expect(estimates.bench.all.n).toBe(2);
      expect(estimates.tri_ext).toBeDefined();
      expect(estimates.tri_ext.all.n).toBe(1);
    });
  });
});
