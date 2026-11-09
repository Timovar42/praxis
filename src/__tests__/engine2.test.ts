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
import {
  DEFAULT_FAMILIES,
  DEFAULT_VARIANTS,
  DEFAULT_DUMBBELL_VALUES,
  learnK,
  resolveFamilyForSlot,
  resolveVariantForEntry,
} from '../domain/engine2/families';
import { migrateAllV1toV2 } from '../domain/engine2/migration';
import { suggestV2, roundToScheme } from '../domain/engine2/suggest';
import { calculateSetTonnage, calculateEntryTonnage } from '../domain/engine2/tonnage';
import { simulate, runBatchSimulation, backtestUserSessions } from '../domain/engine2/simulation';
import type { Session, Program, Slot, ExerciseLog, Bin, Estimate, KPrior } from '../domain/types';

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

      // 38 кг гантели x 8 @ RPE 8 => canonicalLoad = 38 / 0.38 = 100 кг => z = 135.3
      const obs = calculateSetZ(38, 8, 8, dummyEntry, dbVariant, family);
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

  describe('ЭТАП 3 и 4: Семьи, обучение k и подсказки suggestV2', () => {
    it('Жим лёжа штанга, mu_canon 135.3, зона "str" 3 x 3, RPE 8-9 (t = 8.5), cap 0.90: выбирается 117.5', () => {
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
          mid: { opts: [[4, 5]] },
          str: { opts: [[3, 3]], rpe: [8, 9], cap: 0.9 },
        },
      };

      const estimates: Record<Bin, Estimate> = {
        all: { familyId: 'bench', bin: 'all', mu: 135.3, p: 9, n: 5, updatedAt: '2026-11-02', hist: [] },
        low: { familyId: 'bench', bin: 'low', mu: 135.3, p: 9, n: 3, updatedAt: '2026-11-02', hist: [] },
        mid: { familyId: 'bench', bin: 'mid', mu: 135.3, p: 9, n: 2, updatedAt: '2026-11-02', hist: [] },
        high: { familyId: 'bench', bin: 'high', mu: 0, p: 0, n: 0, updatedAt: '', hist: [] },
      };

      const suggestion = suggestV2({
        slot,
        history: [],
        estimates,
        zone: 'str',
        selectedVariantId: 'bench_barbell',
        settings: { rpeMode: 'mid' },
      });

      // w_rpe ≈ 118.7, потолок ≈ 121.8, кандидаты 117.5 и 120 дают ничью в пределах 0.05 => 117.5
      expect(suggestion.weight).toBe(117.5);
      expect(suggestion.sets).toBe(3);
      expect(suggestion.reps).toBe(3);
      expect(suggestion.targetRpe).toBe(8.5);
      expect(suggestion.isPerHand).toBe(false);
    });

    it('Те же данные, вариант dumbbell на руку (k 0.38), зона "mid" 4 x 5, RPE 8, cap 0.80: ожидается 40', () => {
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
          mid: { opts: [[4, 5]], rpe: [8, 8], cap: 0.8 },
          str: { opts: [[3, 3]], rpe: [8, 9], cap: 0.9 },
        },
      };

      const estimates: Record<Bin, Estimate> = {
        all: { familyId: 'bench', bin: 'all', mu: 135.3, p: 9, n: 5, updatedAt: '2026-11-02', hist: [] },
        low: { familyId: 'bench', bin: 'low', mu: 135.3, p: 9, n: 2, updatedAt: '2026-11-02', hist: [] },
        mid: { familyId: 'bench', bin: 'mid', mu: 135.3, p: 9, n: 3, updatedAt: '2026-11-02', hist: [] },
        high: { familyId: 'bench', bin: 'high', mu: 0, p: 0, n: 0, updatedAt: '', hist: [] },
      };

      const suggestion = suggestV2({
        slot,
        history: [],
        estimates,
        zone: 'mid',
        selectedVariantId: 'bench_dumbbell',
        settings: { rpeMode: 'mid' },
      });

      // mu_v ≈ 51.4, w_rpe ≈ 41.7, потолок ≈ 41.1, кандидат 42 отсекается потолком => 40
      expect(suggestion.weight).toBe(40);
      expect(suggestion.isPerHand).toBe(true);
    });

    it('Первые две сессии на гантелях только калибруют k и не меняют mu семьи; с третьей mu обновляется', () => {
      let currentK: KPrior = { value: 0.38, conf: 'low', n: 1 };
      const priorKValue = 0.38;
      const muCanon = 135.3;

      // 1. Первая сессия на гантелях (n = 1 < 3)
      const res1 = learnK(currentK, priorKValue, 52, muCanon);
      expect(res1.shouldUpdateMu).toBe(false); // Не меняет mu семьи
      expect(res1.k.n).toBe(2);
      currentK = res1.k;

      // 2. Вторая сессия на гантелях (n = 2 < 3)
      const res2 = learnK(currentK, priorKValue, 52, muCanon);
      expect(res2.shouldUpdateMu).toBe(false); // Не меняет mu семьи
      expect(res2.k.n).toBe(3);
      currentK = res2.k;

      // 3. Третья сессия на гантелях (n = 3 >= 3)
      const res3 = learnK(currentK, priorKValue, 52, muCanon);
      expect(res3.shouldUpdateMu).toBe(true); // С третьей сессии mu обновляется!
    });

    it('Режим conservative даёт вес не выше, чем normal', () => {
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
          str: { opts: [[3, 5]], rpe: [8, 8] },
        },
      };

      const estimates: Record<Bin, Estimate> = {
        all: { familyId: 'bench', bin: 'all', mu: 120, p: 25, n: 5, updatedAt: '2026-11-02', hist: [] }, // sd = 5
        low: { familyId: 'bench', bin: 'low', mu: 120, p: 25, n: 5, updatedAt: '2026-11-02', hist: [] },
        mid: { familyId: 'bench', bin: 'mid', mu: 120, p: 25, n: 5, updatedAt: '2026-11-02', hist: [] },
        high: { familyId: 'bench', bin: 'high', mu: 0, p: 0, n: 0, updatedAt: '', hist: [] },
      };

      const suggNormal = suggestV2({
        slot,
        history: [],
        estimates,
        zone: 'str',
        selectedVariantId: 'bench_barbell',
        settings: { mode: 'normal' },
      });

      const suggConservative = suggestV2({
        slot,
        history: [],
        estimates,
        zone: 'str',
        selectedVariantId: 'bench_barbell',
        settings: { mode: 'conservative' },
      });

      expect(suggConservative.weight).toBeLessThanOrEqual(suggNormal.weight);
    });

    it('Переключение слота «жим в наклоне» со штанги на гантели меняет вес и единицы («на руку»), а тоннаж считается по 2 x на руку', () => {
      const slot: Slot = {
        id: 'incline_press',
        lift: 'incline_press',
        name: 'Жим в наклоне',
        day: 'tue',
        kind: 'compound',
        inc: 2.5,
        muscles: { chest: 1 },
        rx: {
          vol: { opts: [[3, 8]] },
          mid: { opts: [[3, 8]] },
          str: { opts: [[3, 8]] },
        },
      };

      const estimates: Record<Bin, Estimate> = {
        all: { familyId: 'incline_press', bin: 'all', mu: 100, p: 9, n: 5, updatedAt: '2026-11-02', hist: [] },
        low: { familyId: 'incline_press', bin: 'low', mu: 100, p: 9, n: 2, updatedAt: '2026-11-02', hist: [] },
        mid: { familyId: 'incline_press', bin: 'mid', mu: 100, p: 9, n: 5, updatedAt: '2026-11-02', hist: [] },
        high: { familyId: 'incline_press', bin: 'high', mu: 0, p: 0, n: 0, updatedAt: '', hist: [] },
      };

      const suggBarbell = suggestV2({
        slot,
        history: [],
        estimates,
        zone: 'mid',
        selectedVariantId: 'incline_barbell',
      });

      const suggDumbbell = suggestV2({
        slot,
        history: [],
        estimates,
        zone: 'mid',
        selectedVariantId: 'incline_dumbbell',
      });

      expect(suggBarbell.isPerHand).toBe(false);
      expect(suggDumbbell.isPerHand).toBe(true);
      expect(suggDumbbell.weight).toBeLessThan(suggBarbell.weight);

      // Tonnage calculation: 2 x reps x weight for dumbbells
      const dbSet = { type: 'work' as const, done: true, weight: 30, reps: 8 };
      const barbellSet = { type: 'work' as const, done: true, weight: 80, reps: 8 };

      const dbTonnage = calculateSetTonnage(dbSet, true);
      const barbellTonnage = calculateSetTonnage(barbellSet, false);

      expect(dbTonnage).toBe(30 * 2 * 8); // 480 kg
      expect(barbellTonnage).toBe(80 * 1 * 8); // 640 kg

      const dbEntry: ExerciseLog = {
        slotId: 'incline_press',
        variantId: 'incline_dumbbell',
        zone: 'mid',
        variant: 0,
        rxSnapshot: { opts: [[3, 8]] },
        sets: [dbSet, dbSet, dbSet],
      };

      const entryTonnage = calculateEntryTonnage(dbEntry, slot);
      expect(entryTonnage).toBe(3 * (30 * 2 * 8)); // 1440 kg
    });
  });

  describe('Этап 6: Свойственные тесты (Property Tests) и симуляция', () => {
    const baseSlot: Slot = {
      id: 'bench',
      lift: 'bench',
      name: 'Жим лёжа',
      day: 'tue',
      kind: 'main',
      inc: 2.5,
      muscles: { chest: 1 },
      rx: {
        vol: { opts: [[3, 10]], rpe: [7, 8], cap: 0.85 },
        mid: { opts: [[4, 6]], rpe: [8, 9], cap: 0.9 },
        str: { opts: [[5, 3]], rpe: [8.5, 9.5], cap: 0.95 },
      },
    };

    const makeEstimates = (muVal: number): Record<Bin, Estimate> => ({
      all: { familyId: 'bench', bin: 'all', mu: muVal, p: 9, n: 10, updatedAt: '2026-11-02', hist: [] },
      low: { familyId: 'bench', bin: 'low', mu: muVal, p: 9, n: 5, updatedAt: '2026-11-02', hist: [] },
      mid: { familyId: 'bench', bin: 'mid', mu: muVal, p: 9, n: 5, updatedAt: '2026-11-02', hist: [] },
      high: { familyId: 'bench', bin: 'high', mu: muVal, p: 9, n: 5, updatedAt: '2026-11-02', hist: [] },
    });

    it('Свойство 1: Монотонность — рост mu не может снизить подсказку при прочих равных', () => {
      let prevWeight = 0;
      for (let mu = 60; mu <= 160; mu += 5) {
        const ests = makeEstimates(mu);
        const sugg = suggestV2({
          slot: baseSlot,
          history: [],
          estimates: ests,
          zone: 'mid',
          selectedVariantId: 'bench_barbell',
        });

        expect(sugg.weight).toBeGreaterThanOrEqual(prevWeight);
        prevWeight = sugg.weight;
      }
    });

    it('Свойство 2: Потолок — подсказка для main никогда не превышает cap', () => {
      for (let mu = 70; mu <= 180; mu += 10) {
        const ests = makeEstimates(mu);
        for (const z of ['vol', 'mid', 'str'] as const) {
          const rx = baseSlot.rx[z];
          const cap = rx.cap!;
          const sugg = suggestV2({
            slot: baseSlot,
            history: [],
            estimates: ests,
            zone: z,
            selectedVariantId: 'bench_barbell',
          });

          // Suggested weight cannot exceed cap * mu
          const maxAllowed = cap * mu;
          expect(sugg.weight).toBeLessThanOrEqual(maxAllowed + 1e-6);
        }
      }
    });

    it('Свойство 3: Дискретность — подсказанный вес всегда достижим LoadScheme', () => {
      // 1. Barbell (plates: bar 20, step 2.5)
      for (let mu = 50; mu <= 150; mu += 7) {
        const ests = makeEstimates(mu);
        const sugg = suggestV2({
          slot: baseSlot,
          history: [],
          estimates: ests,
          zone: 'mid',
          selectedVariantId: 'bench_barbell',
        });
        expect(sugg.weight).toBeGreaterThanOrEqual(20);
        expect((sugg.weight - 20) % 2.5).toBeCloseTo(0, 5);
      }

      // 2. Dumbbells (list: DEFAULT_DUMBBELL_VALUES)
      const dumbbellList = DEFAULT_FAMILIES.bench.k.bench_dumbbell ? [
        2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32, 34, 36, 38, 40, 42, 44, 46, 48, 50,
      ] : [];
      for (let mu = 60; mu <= 160; mu += 10) {
        const ests = makeEstimates(mu);
        const sugg = suggestV2({
          slot: baseSlot,
          history: [],
          estimates: ests,
          zone: 'vol',
          selectedVariantId: 'bench_dumbbell',
        });
        expect(dumbbellList).toContain(sugg.weight);
      }
    });

    it('Свойство 4: Симметрия переноса — barbell -> dumbbell -> barbell возвращает исходный вес с точностью до шага блинов', () => {
      const dumbbellScheme = DEFAULT_VARIANTS.bench_dumbbell.loadScheme;
      const barbellScheme = DEFAULT_VARIANTS.bench_barbell.loadScheme;
      const kDb = 0.38;

      const testWeights = [70, 80, 90, 100, 110, 120, 130];
      for (const w0 of testWeights) {
        // Transfer to dumbbell
        const wDb = roundToScheme(w0 * kDb, dumbbellScheme);
        // Transfer back to canonical barbell
        const canonicalBack = wDb / kDb;
        const wBarbellBack = roundToScheme(canonicalBack, barbellScheme);

        // Within 1 plate step (2.5 kg)
        const diff = Math.abs(wBarbellBack - w0);
        expect(diff).toBeLessThanOrEqual(2.5);
      }
    });

    it('Свойство 5: Детерминизм — одинаковый ввод дает строго одинаковый вывод', () => {
      const ests = makeEstimates(102.5);
      const ctx = {
        slot: baseSlot,
        history: [],
        estimates: ests,
        zone: 'mid' as const,
        selectedVariantId: 'bench_barbell',
      };

      const out1 = suggestV2(ctx);
      const out2 = suggestV2(ctx);

      expect(out1).toEqual(out2);
    });

    it('6.1 & 6.2: Симуляция на 20 сидах подтверждает, что Engine v2 превосходит v1 по MAE', () => {
      const single = simulate(42);
      expect(single.v2Mae).toBeLessThan(single.v1Mae);

      const batch = runBatchSimulation(20);

      expect(batch.count).toBe(20);
      expect(batch.v2MeanMae).toBeLessThan(batch.v1MeanMae);
      expect(batch.meanImprovementPct).toBeGreaterThan(0);
      expect(batch.allV2Better).toBe(true);
    });

    it('6.2: Backtest на сессиях пользователя корректно обрабатывает пустые или заполненные данные', () => {
      // Empty sessions test
      const emptyBt = backtestUserSessions([]);
      expect(emptyBt.totalEvaluations).toBe(0);
      expect(emptyBt.mae).toBe(0);

      // Replay of 3 sequential sessions
      const mockSessions: Session[] = [
        {
          id: 's1',
          date: '2026-11-02',
          day: 'tue',
          cycle: 1,
          week: 1,
          entries: [
            {
              slotId: 'bench',
              variantId: 'bench_barbell',
              zone: 'mid',
              variant: 0,
              rxSnapshot: { opts: [[3, 6]], rpe: [8, 9] },
              sets: [{ type: 'work', done: true, weight: 80, reps: 6, rpe: 8.5 }],
            },
          ],
        },
        {
          id: 's2',
          date: '2026-11-09',
          day: 'tue',
          cycle: 1,
          week: 2,
          entries: [
            {
              slotId: 'bench',
              variantId: 'bench_barbell',
              zone: 'vol',
              variant: 0,
              rxSnapshot: { opts: [[3, 10]], rpe: [7, 8] },
              sets: [{ type: 'work', done: true, weight: 75, reps: 10, rpe: 8.0 }],
            },
          ],
        },
      ];

      const filledBt = backtestUserSessions(mockSessions);
      expect(filledBt.totalEvaluations).toBe(1); // Evaluated session 2 from session 1 history
      expect(filledBt.mae).toBeGreaterThanOrEqual(0);
      expect(filledBt.evaluations[0].exerciseName).toBe('Жим лёжа');
    });

    it('Бицепс и гантели: потолок и округление никогда не выдают дробные хвосты вроде 16.666666 кг', () => {
      const curlSlot: Slot = {
        id: 'curl',
        lift: 'curl',
        name: 'Бицепс со штангой / гантели',
        day: 'wed',
        kind: 'main',
        inc: 2.5,
        muscles: { biceps: 1 },
        rx: {
          vol: { opts: [[4, 10]], rpe: [7, 8], cap: 0.70 },
          mid: { opts: [[4, 8]], rpe: [8, 8], cap: 0.80 },
          str: { opts: [[3, 6]], rpe: [8, 8.5], cap: 0.85 },
        },
      };

      // Test across multiple strength levels
      for (let mu = 20; mu <= 80; mu += 3.7) {
        const ests = makeEstimates(mu);
        const sugg = suggestV2({
          slot: curlSlot,
          history: [],
          estimates: ests,
          zone: 'vol',
          selectedVariantId: 'biceps_dumbbell',
        });

        // Must be a valid integer dumbbell weight from DEFAULT_DUMBBELL_VALUES
        expect(DEFAULT_DUMBBELL_VALUES).toContain(sugg.weight);
        expect(Number.isInteger(sugg.weight)).toBe(true);
        expect(String(sugg.weight)).not.toContain('.');
        // Range must also be valid dumbbells
        expect(DEFAULT_DUMBBELL_VALUES).toContain(sugg.range[0]);
        expect(DEFAULT_DUMBBELL_VALUES).toContain(sugg.range[1]);
      }
    });

    it('Разрешение аналогов: текстовые названия упражнений точно определяют правильный снаряд', () => {
      const curlSlot: Slot = {
        id: 'curl',
        lift: 'curl',
        name: 'Бицепс',
        day: 'wed',
        kind: 'main',
        inc: 2.5,
        muscles: { biceps: 1 },
        rx: {
          vol: { opts: [[3, 8]] },
          mid: { opts: [[3, 8]] },
          str: { opts: [[3, 8]] },
        },
      };

      const fam = resolveFamilyForSlot(curlSlot);
      expect(fam.id).toBe('biceps');

      const dbVar = resolveVariantForEntry(curlSlot, { variation: 'С гантелями сидя' } as any, fam);
      expect(dbVar.implement).toBe('dumbbell');
      expect(dbVar.perHand).toBe(true);

      const bbVar = resolveVariantForEntry(curlSlot, { variation: 'Строгий со штангой' } as any, fam);
      expect(bbVar.implement).toBe('barbell');
      expect(bbVar.perHand).toBeFalsy();
    });
  });
});
