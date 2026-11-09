import type { Session, Slot, Settings, Zone, Program, SetLog } from '../types';
import type { Family } from './types';
import { suggest } from '../progression';
import { suggestV2, roundToScheme } from './suggest';
import { rebuildEstimates } from './estimate';
import { pct } from './pct';
import { DEFAULT_FAMILIES, INITIAL_VARIANTS, resolveFamilyForSlot, resolveVariantForEntry } from './families';

/**
 * Deterministic pseudo-random number generator (Mulberry32).
 */
export function createPrng(seed: number): () => number {
  let s = Math.floor(seed) >>> 0;
  return function next() {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Standard normal distribution sampler (Box-Muller).
 */
export function normalSample(prng: () => number, mean = 0, std = 1): number {
  const u1 = Math.max(1e-7, prng());
  const u2 = prng();
  const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
  return mean + z0 * std;
}

export interface SimulationStep {
  week: number;
  date: string;
  zone: Zone;
  variantId: string;
  variantLabel: string;
  true1RM: number;
  idealWeight: number;
  v1Suggested: number;
  v2Suggested: number;
  v1Error: number;
  v2Error: number;
}

export interface SimulationResult {
  seed: number;
  v1Mae: number;
  v2Mae: number;
  improvementPct: number;
  steps: SimulationStep[];
}

/**
 * 6.1 simulate(): synthetic athlete with known true 1RM(t), measurement noise (3-6%),
 * implement switches and zone rotations.
 */
export function simulate(seed = 42): SimulationResult {
  const prng = createPrng(seed);

  // Bench press family
  const benchFamily: Family = {
    ...DEFAULT_FAMILIES.bench,
    k: {
      bench_barbell: { value: 1.0, conf: 'high', n: 5 },
      bench_dumbbell: { value: 0.38, conf: 'med', n: 3 },
      bench_smith: { value: 0.95, conf: 'low', n: 1 },
    },
  };

  const familyCatalog: Record<string, Family> = {
    ...DEFAULT_FAMILIES,
    bench: benchFamily,
  };

  const slot: Slot = {
    id: 'bench_slot',
    lift: 'bench',
    name: 'Жим лёжа',
    day: 'mon',
    kind: 'main',
    inc: 2.5,
    muscles: { chest: 1, triceps: 0.5 },
    rx: {
      vol: { opts: [[3, 10]], rpe: [7, 8] },
      mid: { opts: [[4, 6]], rpe: [8, 9] },
      str: { opts: [[5, 3]], rpe: [8.5, 9.5] },
    },
    familyId: 'bench',
  };

  const trueK: Record<string, number> = {
    bench_barbell: 1.0,
    bench_dumbbell: 0.38,
    bench_smith: 0.95,
  };

  // Schedule over 16 weeks
  const zones: Zone[] = ['vol', 'mid', 'str'];
  const variants: string[] = [
    'bench_barbell',
    'bench_barbell',
    'bench_barbell',
    'bench_barbell',
    'bench_dumbbell',
    'bench_dumbbell',
    'bench_dumbbell',
    'bench_dumbbell',
    'bench_smith',
    'bench_smith',
    'bench_smith',
    'bench_smith',
    'bench_barbell',
    'bench_barbell',
    'bench_barbell',
    'bench_barbell',
  ];

  const sessionsHistoryV1: Session[] = [];
  const sessionsHistoryV2: Session[] = [];
  const steps: SimulationStep[] = [];

  let v1TotalAbsError = 0;
  let v2TotalAbsError = 0;

  for (let w = 0; w < 16; w++) {
    const weekNum = w + 1;
    const date = `2026-0${Math.floor(w / 4) + 1}-${String((w % 4) * 7 + 1).padStart(2, '0')}`;
    const zone = zones[w % zones.length];
    const variantId = variants[w];
    const variant = INITIAL_VARIANTS[variantId];
    const rx = slot.rx[zone];
    const targetReps = rx.opts[0][1] as number;
    const targetRpe = (rx.rpe![0] + rx.rpe![1]) / 2;

    // True athlete strength evolves linearly with 0.5 kg/week gain
    const true1RM = 100 + 0.5 * w;
    const variantTrue1RM = true1RM * trueK[variantId];
    const pctVal = pct(targetReps + 10 - targetRpe);
    const rawIdealWeight = variantTrue1RM * pctVal;
    const idealWeight = roundToScheme(rawIdealWeight, variant.loadScheme);

    // 1. Suggestion from Engine v1
    // Compute v1 reference e1RM from history
    let v1RefE1rm = 0;
    for (let i = sessionsHistoryV1.length - 1; i >= 0; i--) {
      const ent = sessionsHistoryV1[i].entries?.find((e) => e.slotId === slot.id);
      if (ent && ent.sets && ent.sets.length > 0) {
        const topSet = ent.sets.find((s) => s.done && s.weight && s.reps);
        if (topSet && topSet.weight && topSet.reps) {
          // Epley
          v1RefE1rm = topSet.weight * (1 + 0.0333 * (topSet.reps + (10 - (topSet.rpe ?? 8))));
          break;
        }
      }
    }
    if (v1RefE1rm === 0) v1RefE1rm = 100; // baseline

    const v1Res = suggest(slot, zone, 0, rx, v1RefE1rm, { formula: 'epley', rpeMode: 'mid', units: 'kg' });
    const v1Suggested = v1Res?.weight ?? idealWeight;

    // 2. Suggestion from Engine v2
    const v2Estimates = rebuildEstimates(sessionsHistoryV2, familyCatalog, { formula: 'epley' });
    const famEsts = v2Estimates.bench ?? {
      all: { familyId: 'bench', bin: 'all', mu: 100, p: 16, n: 0, updatedAt: '', hist: [] },
      low: { familyId: 'bench', bin: 'low', mu: 100, p: 16, n: 0, updatedAt: '', hist: [] },
      mid: { familyId: 'bench', bin: 'mid', mu: 100, p: 16, n: 0, updatedAt: '', hist: [] },
      high: { familyId: 'bench', bin: 'high', mu: 100, p: 16, n: 0, updatedAt: '', hist: [] },
    };

    const v2Res = suggestV2({
      slot,
      history: sessionsHistoryV2,
      estimates: famEsts,
      allEstimates: v2Estimates,
      family: familyCatalog.bench,
      selectedVariantId: variantId,
      zone,
      variantIndex: 0,
      settings: { formula: 'epley' },
    });
    const v2Suggested = v2Res.weight > 0 ? v2Res.weight : idealWeight;

    const v1Error = Math.abs(v1Suggested - idealWeight);
    const v2Error = Math.abs(v2Suggested - idealWeight);

    v1TotalAbsError += v1Error;
    v2TotalAbsError += v2Error;

    steps.push({
      week: weekNum,
      date,
      zone,
      variantId,
      variantLabel: variant.label,
      true1RM,
      idealWeight,
      v1Suggested,
      v2Suggested,
      v1Error,
      v2Error,
    });

    // Synthetic performance with 3-6% Gaussian measurement noise
    const noiseRel = normalSample(prng, 0, 0.04); // 4% sd
    const performedE1RM = variantTrue1RM * (1 + noiseRel);
    // Reps performed at chosen working weight
    const chosenWeight = v2Suggested;
    const impliedPct = chosenWeight / performedE1RM;
    const impliedN = (1 / impliedPct - 1) * 30; // inverse Epley approx
    const actualReps = Math.max(1, Math.round(targetReps + normalSample(prng, 0, 0.5)));
    const actualRpe = Math.min(10, Math.max(6, Math.round((10 - (impliedN - actualReps)) * 2) / 2));

    const workSets: SetLog[] = Array.from({ length: rx.opts[0][0] }, () => ({
      type: 'work',
      weight: chosenWeight,
      reps: actualReps,
      rpe: actualRpe,
      done: true,
    }));

    const sessionRecord: Session = {
      id: `sim_sess_${w}`,
      date,
      day: 'mon',
      cycle: 1,
      week: weekNum,
      entries: [
        {
          slotId: slot.id,
          zone,
          variant: 0,
          rxSnapshot: rx,
          variantId,
          variation: variant.label,
          sets: workSets,
        },
      ],
    };

    sessionsHistoryV1.push(sessionRecord);
    sessionsHistoryV2.push(sessionRecord);
  }

  const v1Mae = v1TotalAbsError / steps.length;
  const v2Mae = v2TotalAbsError / steps.length;
  const improvementPct = v1Mae > 0 ? ((v1Mae - v2Mae) / v1Mae) * 100 : 0;

  return {
    seed,
    v1Mae: Math.round(v1Mae * 100) / 100,
    v2Mae: Math.round(v2Mae * 100) / 100,
    improvementPct: Math.round(improvementPct * 10) / 10,
    steps,
  };
}

/**
 * Runs 20 seeds of the simulation benchmark and computes statistics.
 */
export function runBatchSimulation(seedsCount = 20): {
  count: number;
  v1MeanMae: number;
  v2MeanMae: number;
  meanImprovementPct: number;
  allV2Better: boolean;
  results: SimulationResult[];
} {
  const results: SimulationResult[] = [];
  let sumV1 = 0;
  let sumV2 = 0;
  let allBetter = true;

  for (let s = 1; s <= seedsCount; s++) {
    const res = simulate(s * 1337 + 7);
    results.push(res);
    sumV1 += res.v1Mae;
    sumV2 += res.v2Mae;
    if (res.v2Mae > res.v1Mae) {
      allBetter = false;
    }
  }

  const v1MeanMae = Math.round((sumV1 / seedsCount) * 100) / 100;
  const v2MeanMae = Math.round((sumV2 / seedsCount) * 100) / 100;
  const meanImprovementPct = Math.round(((v1MeanMae - v2MeanMae) / v1MeanMae) * 1000) / 10;

  return {
    count: seedsCount,
    v1MeanMae,
    v2MeanMae,
    meanImprovementPct,
    allV2Better: allBetter,
    results,
  };
}

export interface UserBacktestEvaluation {
  sessionId: string;
  date: string;
  slotId: string;
  exerciseName: string;
  variantLabel: string;
  suggestedWeight: number;
  actualWeight: number;
  error: number;
  signedError: number;
  within2_5kg: boolean;
}

export interface UserBacktestSummary {
  totalEvaluations: number;
  mae: number;
  bias: number; // mean signed error (suggested - actual)
  hitRate2_5kg: number; // fraction within +- 2.5 kg (0..1)
  evaluations: UserBacktestEvaluation[];
}

/**
 * 6.2 Backtest on real user sessions:
 * Replays user history chronologically. For each session t,
 * calculates what v2 would have suggested prior to session t,
 * and compares it to actual logged weights.
 */
export function backtestUserSessions(
  sessions: Session[],
  program?: Program | null,
  settings: Partial<Settings> = {}
): UserBacktestSummary {
  const sorted = [...sessions].sort((a, b) => a.date.localeCompare(b.date));
  const slotMap = new Map<string, Slot>(program?.slots.map((s) => [s.id, s]) || []);

  const evaluations: UserBacktestEvaluation[] = [];
  const historyBefore: Session[] = [];

  for (const session of sorted) {
    if (session.badDay) {
      historyBefore.push(session);
      continue;
    }

    // Build estimates up to this session
    const priorEstimates = rebuildEstimates(historyBefore, DEFAULT_FAMILIES, settings);

    for (const entry of session.entries || []) {
      if (entry.skipped || !entry.sets || entry.sets.length === 0) continue;

      const workSets = entry.sets.filter((s) => s.done && s.weight != null && s.weight > 0);
      if (workSets.length === 0) continue;

      const actualWeight = workSets[0].weight!;

      const dummySlot: Slot = slotMap.get(entry.slotId) || {
        id: entry.slotId,
        lift: entry.slotId,
        name: entry.customName || entry.slotId,
        day: session.day,
        kind: 'isolation',
        inc: 2.5,
        muscles: {},
        rx: { vol: entry.rxSnapshot, mid: entry.rxSnapshot, str: entry.rxSnapshot },
      };

      const family = resolveFamilyForSlot(dummySlot, DEFAULT_FAMILIES);
      const variant = resolveVariantForEntry(dummySlot, entry, family);
      const famEsts = priorEstimates[family.id];

      // Only backtest if we already had at least 1 observation in this family prior to session
      if (!famEsts || famEsts.all.n === 0) {
        continue;
      }

      const suggestion = suggestV2({
        slot: dummySlot,
        history: historyBefore,
        estimates: famEsts,
        allEstimates: priorEstimates,
        family,
        selectedVariantId: entry.variantId || variant.id,
        zone: entry.zone,
        variantIndex: entry.variant ?? 0,
        settings,
      });

      if (suggestion.weight > 0) {
        const error = Math.abs(suggestion.weight - actualWeight);
        const signedError = suggestion.weight - actualWeight;
        const within2_5kg = error <= 2.5;

        evaluations.push({
          sessionId: session.id,
          date: session.date,
          slotId: dummySlot.id,
          exerciseName:
            dummySlot.name && dummySlot.name !== dummySlot.id
              ? dummySlot.name
              : family?.name || dummySlot.id,
          variantLabel: variant.label,
          suggestedWeight: suggestion.weight,
          actualWeight,
          error,
          signedError,
          within2_5kg,
        });
      }
    }

    historyBefore.push(session);
  }

  if (evaluations.length === 0) {
    return {
      totalEvaluations: 0,
      mae: 0,
      bias: 0,
      hitRate2_5kg: 0,
      evaluations: [],
    };
  }

  const sumError = evaluations.reduce((acc, e) => acc + e.error, 0);
  const sumSignedError = evaluations.reduce((acc, e) => acc + e.signedError, 0);
  const hits = evaluations.filter((e) => e.within2_5kg).length;

  return {
    totalEvaluations: evaluations.length,
    mae: Math.round((sumError / evaluations.length) * 100) / 100,
    bias: Math.round((sumSignedError / evaluations.length) * 100) / 100,
    hitRate2_5kg: Math.round((hits / evaluations.length) * 1000) / 1000,
    evaluations,
  };
}
