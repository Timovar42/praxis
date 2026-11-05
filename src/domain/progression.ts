import type { SetLog, Rx, Zone, Slot, Settings, Suggestion } from './types';

// ---- e1RM calculation ----

export function calcE1RM(weight: number, reps: number, rpe: number, formula: Settings['formula'] = 'epley'): number {
  const rir = 10 - rpe;
  const n = reps + rir;
  if (n > 15) return 0; // unreliable
  if (formula === 'brzycki') {
    // Brzycki: weight / (1.0278 - 0.0278 * totalReps)
    const totalReps = reps + rir; // approximate
    const denom = 1.0278 - 0.0278 * totalReps;
    if (denom <= 0) return 0;
    return weight / denom;
  }
  // Epley: weight * (1 + n/30)
  return weight * (1 + n / 30);
}

export function sessionE1RM(sets: SetLog[], exerciseRpe: number | undefined, formula: Settings['formula']): number {
  let max = 0;
  for (const s of sets) {
    if (s.type !== 'work') continue;
    if (s.weight == null || s.reps == null) continue;
    const rpe = s.rpe ?? exerciseRpe;
    if (rpe == null) continue;
    const v = calcE1RM(s.weight, s.reps, rpe, formula);
    if (v > max) max = v;
  }
  return max;
}

// sessions: array of { e1rm, badDay } newest first
export function referenceE1RM(
  sessions: Array<{ e1rm: number; badDay?: boolean }>,
  previousRef: number | null
): { value: number; check: boolean } {
  const valid = sessions.filter((s) => !s.badDay && s.e1rm > 0);
  if (valid.length === 0) return { value: previousRef ?? 0, check: false };

  const weights = [0.5, 0.3, 0.2];
  let weightedSum = 0;
  let weightTotal = 0;
  for (let i = 0; i < Math.min(valid.length, 3); i++) {
    weightedSum += valid[i].e1rm * weights[i];
    weightTotal += weights[i];
  }
  let newRef = weightedSum / weightTotal;

  let check = false;
  if (previousRef && previousRef > 0) {
    const cap = previousRef * 1.05;
    if (newRef > cap) {
      newRef = cap;
      check = true;
    }
  }
  return { value: newRef, check };
}

// ---- Suggestion ----

function targetRpe(rx: Rx, mode: Settings['rpeMode']): number {
  if (!rx.rpe) return 8;
  const [lo, hi] = rx.rpe;
  if (mode === 'low') return lo;
  if (mode === 'high') return hi;
  return (lo + hi) / 2;
}

function optReps(rx: Rx, variant: number): number | [number, number] {
  const opt = rx.opts[variant] ?? rx.opts[0];
  return opt[1];
}

function optSets(rx: Rx, variant: number): number {
  const opt = rx.opts[variant] ?? rx.opts[0];
  return opt[0];
}

function repValue(reps: number | [number, number]): number {
  if (Array.isArray(reps)) return reps[1]; // upper bound for suggestions
  return reps;
}

function roundToStep(value: number, step: number, down = false): number {
  if (step <= 0) return value;
  if (down) return Math.floor(value / step) * step;
  return Math.round(value / step) * step;
}

export function suggest(
  slot: Pick<Slot, 'kind' | 'inc'>,
  _zone: Zone,
  variant: number,
  rx: Rx,
  e1rm: number,
  settings: Settings
): Suggestion | null {
  if (slot.kind === 'warmup') return null;
  if (e1rm <= 0) return null;

  const t = targetRpe(rx, settings.rpeMode);
  const repsRaw = optReps(rx, variant);
  const r = repValue(repsRaw);
  const sets = optSets(rx, variant);

  // w_rpe = e1rm / (1 + (r + 10 - t) / 30)
  const wRpe = e1rm / (1 + (r + 10 - t) / 30);

  let wCap = Infinity;
  if (rx.cap != null) {
    wCap = rx.cap * e1rm;
  }

  const cappedDown = wRpe > wCap;
  const w = Math.min(wRpe, wCap);
  const weight = roundToStep(w, slot.inc, cappedDown);

  const pct = Math.round((weight / e1rm) * 100);
  let explanation = `e1RM ${Math.round(e1rm)} кг`;
  explanation += `, ${r} повт.`;
  const rir = Math.round(10 - t);
  explanation += ` + ${rir} RIR → ${pct}%`;
  if (cappedDown && rx.cap != null) {
    explanation += `, потолок ${Math.round(rx.cap * 100)}% → ${weight} кг`;
  } else {
    explanation += ` → ${weight} кг`;
  }

  return {
    weight,
    reps: repsRaw,
    sets,
    explanation,
    cappedDown,
  };
}
