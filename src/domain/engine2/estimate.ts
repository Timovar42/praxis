import type { Session, Slot, ExerciseLog, Settings } from '../types';
import type { Family, Variant, Estimate, Bin, Trend } from './types';
import { pct } from './pct';
import { resolveFamilyForSlot, resolveVariantForEntry, DEFAULT_FAMILIES } from './families';
import { differenceInCalendarDays, parseISO } from 'date-fns';

export interface SetObservation {
  z: number;
  n: number;
  reps: number;
  rpe: number;
  rpeImputed: boolean;
}

export interface SessionObservation {
  zSession: number;
  avgN: number;
  avgReps: number;
  avgRpe: number;
  rpeImputed: boolean;
  bin: 'low' | 'mid' | 'high';
  variant: Variant;
  family: Family;
  isDeload: boolean;
}

/**
 * Maps repetition count to rep range bin:
 * low <= 5, mid 6-10, high >= 11
 */
export function getBinForReps(reps: number): 'low' | 'mid' | 'high' {
  if (reps <= 5) return 'low';
  if (reps <= 10) return 'mid';
  return 'high';
}

/**
 * 2.2 Observation of a set:
 * z = canonicalLoad / pct(reps + RIR), where canonicalLoad = entered weight / k(variant).
 * RPE from set, else from exercise, else midpoint of target prescription RPE range.
 */
export function calculateSetZ(
  weight: number,
  reps: number,
  rpeValue: number | undefined,
  entry: ExerciseLog,
  variant: Variant,
  family: Family,
  formula?: Settings['formula']
): SetObservation | null {
  if (weight <= 0 || reps <= 0) return null;

  // Resolve RPE
  let rpe = rpeValue;
  let rpeImputed = false;

  if (rpe == null) {
    if (entry.rpe != null) {
      rpe = entry.rpe;
    } else if (entry.rxSnapshot?.rpe && entry.rxSnapshot.rpe.length === 2) {
      rpe = (entry.rxSnapshot.rpe[0] + entry.rxSnapshot.rpe[1]) / 2;
      rpeImputed = true;
    } else {
      rpe = 8.0;
      rpeImputed = true;
    }
  }

  // RIR = 10 - RPE, RPE 10 => RIR = 0
  const rir = Math.max(0, 10 - rpe);
  const n = reps + rir;

  // Values n > 20 are not used in strength estimates
  if (n > 20) return null;

  // Canonical load = entered weight / k(variant)
  const kVal = family.k[variant.id]?.value ?? 1.0;
  const canonicalLoad = weight / kVal;

  const pctVal = pct(n, formula);
  if (pctVal <= 0) return null;

  const z = canonicalLoad / pctVal;

  return {
    z,
    n,
    reps,
    rpe,
    rpeImputed,
  };
}

/**
 * 2.3 Session observation:
 * Only work sets (not warmup, attack, drop).
 * z_session = average of 2 best z values among sets (or single z if only 1 set).
 */
export function calculateSessionObservation(
  entry: ExerciseLog,
  slot: Slot,
  family: Family,
  isDeload: boolean = false,
  formula?: Settings['formula']
): SessionObservation | null {
  if (entry.skipped || !entry.sets || entry.sets.length === 0) return null;

  const variant = resolveVariantForEntry(slot, entry, family);

  // Filter valid work sets
  const validSetObs: SetObservation[] = [];
  for (const set of entry.sets) {
    if (set.type !== 'work' || !set.done || set.weight == null || set.reps == null) {
      continue;
    }
    const obs = calculateSetZ(set.weight, set.reps, set.rpe, entry, variant, family, formula);
    if (obs && !isNaN(obs.z) && obs.z > 0) {
      validSetObs.push(obs);
    }
  }

  if (validSetObs.length === 0) return null;

  // Sort descending by z
  validSetObs.sort((a, b) => b.z - a.z);

  let zSession: number;
  let topObs: SetObservation[];

  if (validSetObs.length === 1) {
    topObs = [validSetObs[0]];
    zSession = validSetObs[0].z;
  } else {
    topObs = [validSetObs[0], validSetObs[1]];
    zSession = (validSetObs[0].z + validSetObs[1].z) / 2;
  }

  const avgN = topObs.reduce((sum, o) => sum + o.n, 0) / topObs.length;
  const avgReps = topObs.reduce((sum, o) => sum + o.reps, 0) / topObs.length;
  const avgRpe = topObs.reduce((sum, o) => sum + o.rpe, 0) / topObs.length;
  const rpeImputed = topObs.some((o) => o.rpeImputed);

  const bin = getBinForReps(avgReps);

  return {
    zSession,
    avgN,
    avgReps,
    avgRpe,
    rpeImputed,
    bin,
    variant,
    family,
    isDeload,
  };
}

/**
 * 2.4 Kalman Filter 1D step for a given (family, bin) estimate.
 */
export function kalmanUpdate(
  current: Estimate | null,
  obs: {
    z: number;
    n: number;
    rpe: number;
    rpeImputed: boolean;
    implement: string;
    conf: 'high' | 'med' | 'low';
    isDeload?: boolean;
    date: string;
  },
  settings: Partial<Settings> = {},
  initialMode: '1rm' | 'set' | 'prior' = 'set'
): { updated: Estimate; check: boolean } {
  const { z, n, rpe, rpeImputed, implement, conf, isDeload = false, date } = obs;

  // Initialize if no prior estimate exists
  if (!current || current.n === 0) {
    let sdFraction: number;
    if (initialMode === '1rm') sdFraction = 0.05; // 5%
    else if (initialMode === 'prior') sdFraction = 0.15; // 15%
    else sdFraction = 0.08; // 8% from weight x reps x RPE

    const initialSd = sdFraction * z;
    const initialP = initialSd * initialSd;

    const newEstimate: Estimate = {
      familyId: current?.familyId || 'unknown',
      bin: current?.bin || 'all',
      mu: z,
      p: initialP,
      n: 1,
      updatedAt: date,
      hist: [{ date, mu: z, sd: initialSd }],
    };

    return { updated: newEstimate, check: false };
  }

  // 1. Time step w (weeks elapsed, clamped to [0.5, 6])
  let w = 1.0;
  if (current.updatedAt) {
    try {
      const d1 = parseISO(date);
      const d2 = parseISO(current.updatedAt);
      const diffDays = Math.abs(differenceInCalendarDays(d1, d2));
      if (!isNaN(diffDays)) {
        w = diffDays / 7;
        w = Math.max(0.5, Math.min(6.0, w));
      }
    } catch {
      w = 1.0;
    }
  }

  // Process noise Q = (0.01 * mu)^2 * w, multiplied by 0.8 during cut
  let q = Math.pow(0.01 * current.mu, 2) * w;
  if (settings.phase === 'cut') {
    q *= 0.8;
  }

  const pMinus = current.p + q;
  const muMinus = current.mu;

  // 2. Observation noise R = (c * mu)^2 * multipliers
  let c: number;
  if (n <= 6) c = 0.03;
  else if (n <= 10) c = 0.045;
  else if (n <= 15) c = 0.07;
  else c = 0.1;

  let rBase = Math.pow(c * muMinus, 2);

  // Multipliers
  let multiplier = 1.0;
  if (rpeImputed) multiplier *= 1.5;
  if (rpe <= 6.5) multiplier *= 1.4;
  if (implement === 'smith' || implement === 'machine' || implement === 'cable') {
    multiplier *= 1.3;
  }

  // Equipment uncertainty: 1 + 0.5 * (1 - confNumeric)
  const confNumeric = conf === 'high' ? 1.0 : conf === 'med' ? 0.5 : 0.0;
  multiplier *= 1 + 0.5 * (1 - confNumeric);

  if (isDeload) multiplier *= 2.0;

  const r = rBase * multiplier;

  // 3. Outlier protection: |z - muMinus| > 3 * sqrt(pMinus + r)
  const s = Math.sqrt(pMinus + r);
  const delta = z - muMinus;
  let check = false;
  let zEffective = z;

  if (Math.abs(delta) > 3 * s) {
    zEffective = muMinus + Math.sign(delta) * 3 * s;
    check = true;
  }

  // 4. Update step
  const kGain = pMinus / (pMinus + r);
  const muNew = muMinus + kGain * (zEffective - muMinus);
  const pNew = (1 - kGain) * pMinus;
  const sdNew = Math.sqrt(pNew);

  const hist = [...current.hist, { date, mu: muNew, sd: sdNew }];

  const updated: Estimate = {
    ...current,
    mu: muNew,
    p: pNew,
    n: current.n + 1,
    updatedAt: date,
    hist,
  };

  return { updated, check };
}

/**
 * 2.5 Personal rep range calibration:
 * bias_bin = EMA(0.3) of ln(mu_bin / mu_all) when both have n >= 2.
 * For target r reps, use mu_bin if n_bin >= 3, else mu_all * exp(bias_bin).
 */
export function updateRepRangeBias(
  estimateBin: Estimate,
  estimateAll: Estimate,
  currentBias: number = 0
): number {
  if (estimateBin.n >= 2 && estimateAll.n >= 2 && estimateAll.mu > 0 && estimateBin.mu > 0) {
    const rawRatio = Math.log(estimateBin.mu / estimateAll.mu);
    return 0.3 * rawRatio + 0.7 * currentBias;
  }
  return currentBias;
}

/**
 * Resolves calibrated e1RM for target reps r.
 */
export function getCalibratedE1RM(
  r: number,
  estimates: Record<Bin, Estimate>,
  biases: Record<'low' | 'mid' | 'high', number> = { low: 0, mid: 0, high: 0 }
): { e1rm: number; sourceBin: Bin } {
  const targetBin = getBinForReps(r);
  const binEst = estimates[targetBin];
  const allEst = estimates.all;

  if (binEst && binEst.n >= 3 && binEst.mu > 0) {
    return { e1rm: binEst.mu, sourceBin: targetBin };
  }

  const baseMu = allEst?.mu || binEst?.mu || 0;
  const bias = biases[targetBin] ?? 0;
  const calibrated = baseMu * Math.exp(bias);

  return { e1rm: calibrated, sourceBin: 'all' };
}

/**
 * 2.6 Trend: Linear regression of mu over up to the last 6 exposures of a family.
 * 'растёт' (> +0.3% / week), 'держится' ([-0.3%, +0.3%]), 'падает' (< -0.3% / week).
 */
export function calculateTrend(estimate: Estimate): Trend {
  const history = estimate.hist || [];
  if (history.length < 2) return 'держится';

  // Last up to 6 exposures
  const window = history.slice(-6);
  if (window.length < 2) return 'держится';

  const firstDate = parseISO(window[0].date);
  const points = window.map((p) => {
    const days = differenceInCalendarDays(parseISO(p.date), firstDate);
    return { t: days / 7, mu: p.mu }; // t in weeks
  });

  const n = points.length;
  const tMean = points.reduce((acc, p) => acc + p.t, 0) / n;
  const muMean = points.reduce((acc, p) => acc + p.mu, 0) / n;

  let numerator = 0;
  let denominator = 0;
  for (const p of points) {
    numerator += (p.t - tMean) * (p.mu - muMean);
    denominator += Math.pow(p.t - tMean, 2);
  }

  // If all sessions on same day or zero variance in time
  if (denominator === 0) return 'держится';

  const slope = numerator / denominator; // kg / week
  const latestMu = window[window.length - 1].mu;
  if (latestMu <= 0) return 'держится';

  const relativeRate = slope / latestMu; // rate per week

  if (relativeRate > 0.003) return 'растёт';
  if (relativeRate < -0.003) return 'падает';
  return 'держится';
}

/**
 * Rebuilds all family estimates from scratch idempotently across historical sessions.
 * Skips sessions with badDay === true or pain.
 */
export function rebuildEstimates(
  sessions: Session[],
  families: Record<string, Family> = DEFAULT_FAMILIES,
  settings: Partial<Settings> = {}
): Record<string, Record<Bin, Estimate>> {
  // Sort sessions chronologically ascending
  const sorted = [...sessions].sort((a, b) => a.date.localeCompare(b.date));

  const result: Record<string, Record<Bin, Estimate>> = {};
  const biases: Record<string, Record<'low' | 'mid' | 'high', number>> = {};

  for (const session of sorted) {
    // Skip badDay or pain sessions
    if (session.badDay) continue;
    if (session.note && (session.note.toLowerCase().includes('боль') || session.note.toLowerCase().includes('травма'))) {
      continue;
    }

    const isDeload = Boolean(
      session.note &&
        (session.note.toLowerCase().includes('deload') || session.note.toLowerCase().includes('разгрузка'))
    );

    for (const entry of session.entries || []) {
      if (entry.skipped) continue;

      const dummySlot: Slot = {
        id: entry.slotId,
        lift: entry.slotId,
        name: entry.customName || entry.slotId,
        day: session.day,
        kind: 'isolation',
        inc: 2.5,
        muscles: {},
        rx: { vol: entry.rxSnapshot, mid: entry.rxSnapshot, str: entry.rxSnapshot },
      };

      const family = resolveFamilyForSlot(dummySlot, families);
      const obs = calculateSessionObservation(entry, dummySlot, family, isDeload, settings.formula);
      if (!obs) continue;

      // Initialize family containers if needed
      if (!result[family.id]) {
        result[family.id] = {
          all: { familyId: family.id, bin: 'all', mu: 0, p: 0, n: 0, updatedAt: '', hist: [] },
          low: { familyId: family.id, bin: 'low', mu: 0, p: 0, n: 0, updatedAt: '', hist: [] },
          mid: { familyId: family.id, bin: 'mid', mu: 0, p: 0, n: 0, updatedAt: '', hist: [] },
          high: { familyId: family.id, bin: 'high', mu: 0, p: 0, n: 0, updatedAt: '', hist: [] },
        };
        biases[family.id] = { low: 0, mid: 0, high: 0 };
      }

      const famEsts = result[family.id];
      const famBiases = biases[family.id];
      const conf = family.k[obs.variant.id]?.conf ?? 'high';

      const kalmanInput = {
        z: obs.zSession,
        n: obs.avgN,
        rpe: obs.avgRpe,
        rpeImputed: obs.rpeImputed,
        implement: obs.variant.implement,
        conf,
        isDeload: obs.isDeload,
        date: session.date,
      };

      // 1. Update 'all' bin
      const updateAll = kalmanUpdate(famEsts.all.n === 0 ? null : famEsts.all, kalmanInput, settings);
      famEsts.all = updateAll.updated;

      // 2. Update specific bin ('low' | 'mid' | 'high')
      const targetBin = obs.bin;
      const curBinEst = famEsts[targetBin];
      const updateBin = kalmanUpdate(curBinEst.n === 0 ? null : curBinEst, kalmanInput, settings);
      famEsts[targetBin] = updateBin.updated;

      // 3. Update personal calibration bias for this bin
      famBiases[targetBin] = updateRepRangeBias(famEsts[targetBin], famEsts.all, famBiases[targetBin]);
      famEsts[targetBin].bias = famBiases[targetBin];
    }
  }

  return result;
}
