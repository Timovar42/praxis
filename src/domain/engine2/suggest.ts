import type { Slot, Session, Settings, Zone } from '../types';
import type { Family, Variant, Estimate, Bin, LoadScheme } from './types';
import { pct, PCT_TABLE } from './pct';
import { getCalibratedE1RM } from './estimate';
import { resolveFamilyForSlot, resolveVariantForEntry, DEFAULT_FAMILIES } from './families';

export interface SuggestContext {
  slot: Slot;
  history: Session[];
  estimates: Record<Bin, Estimate>;
  family?: Family;
  settings?: Partial<Settings>;
  selectedVariantId?: string;
  zone: Zone;
  variantIndex?: number;
}

export interface ExplainStep {
  label: string;
  value: string;
}

export interface SuggestionV2 {
  weight: number;
  reps: number | [number, number];
  sets: number;
  targetRpe: number;
  confidence: 'high' | 'med' | 'low';
  range: [number, number];
  alternatives: { variantId: string; label: string; weight: number }[];
  explain: ExplainStep[];
  flags: string[];
  warmups?: { weight: number; reps: number }[];
  isPerHand?: boolean;
}

/**
 * Inverts the pct function: given fraction alpha = weight / mu_v,
 * returns n = reps + RIR such that pct(n) = alpha.
 */
export function invertPct(alpha: number): number {
  if (alpha >= 1.0) return 1.0;

  // Between 1 and 12
  if (alpha >= 0.68) {
    for (let i = 1; i < 12; i++) {
      const v0 = PCT_TABLE[i];
      const v1 = PCT_TABLE[i + 1];
      if (alpha <= v0 && alpha >= v1) {
        const diff = v0 - v1;
        if (diff === 0) return i;
        const frac = (v0 - alpha) / diff;
        return i + frac;
      }
    }
    return 12.0;
  }

  // For alpha < 0.68: pct(n) = 0.680 * 1.4 / (1 + n/30) = alpha
  // => 1 + n/30 = (0.680 * 1.4) / alpha
  const numerator = 0.68 * 1.4;
  return 30 * (numerator / alpha - 1);
}

/**
 * Rounds a target raw weight according to the variant's LoadScheme.
 */
export function roundToScheme(weight: number, scheme: LoadScheme): number {
  if (scheme.type === 'plates') {
    const bar = scheme.bar;
    const step = scheme.minStep || 2.5;
    if (weight <= bar) return bar;
    return bar + Math.round((weight - bar) / step) * step;
  }

  if (scheme.type === 'list') {
    const values = [...scheme.values].sort((a, b) => a - b);
    if (values.length === 0) return weight;
    if (weight <= values[0]) return values[0];
    if (weight >= values[values.length - 1]) return values[values.length - 1];

    let closest = values[0];
    let minDiff = Math.abs(weight - values[0]);
    for (const v of values) {
      const diff = Math.abs(weight - v);
      if (diff < minDiff) {
        minDiff = diff;
        closest = v;
      }
    }
    return closest;
  }

  if (scheme.type === 'stack') {
    const step = scheme.step || 5.0;
    if (weight <= 0) return step;
    return Math.max(step, Math.round(weight / step) * step);
  }

  return weight;
}

/**
 * Generates candidate weights (lower and upper) according to LoadScheme and optional cap.
 */
export function getSchemeCandidates(
  weight: number,
  scheme: LoadScheme,
  capValue?: number
): { lo: number; hi: number } {
  let lo: number;
  let hi: number;

  if (scheme.type === 'plates') {
    const bar = scheme.bar;
    const step = scheme.minStep || 2.5;
    if (weight <= bar) {
      lo = bar;
      hi = bar;
    } else {
      lo = bar + Math.floor((weight - bar) / step) * step;
      hi = bar + Math.ceil((weight - bar) / step) * step;
    }
  } else if (scheme.type === 'list') {
    const values = [...scheme.values].sort((a, b) => a - b);
    if (values.length === 0) {
      lo = weight;
      hi = weight;
    } else if (weight <= values[0]) {
      lo = values[0];
      hi = values[0];
    } else if (weight >= values[values.length - 1]) {
      lo = values[values.length - 1];
      hi = values[values.length - 1];
    } else {
      let l = values[0];
      let h = values[values.length - 1];
      for (const v of values) {
        if (v <= weight) l = v;
        if (v >= weight && h === values[values.length - 1]) h = v;
      }
      lo = l;
      hi = h;
    }
  } else {
    // stack
    const step = scheme.step || 5.0;
    lo = Math.max(step, Math.floor(weight / step) * step);
    hi = Math.max(step, Math.ceil(weight / step) * step);
  }

  // Active cap rule: "при активном потолке только кандидаты не выше потолка"
  if (capValue != null) {
    if (hi > capValue && lo <= capValue) {
      hi = lo;
    } else if (lo > capValue) {
      lo = capValue;
      hi = capValue;
    }
  }

  return { lo, hi };
}

/**
 * Generates an intelligent strength suggestion for the next session.
 */
export function suggestV2(ctx: SuggestContext): SuggestionV2 {
  const {
    slot,
    history = [],
    estimates,
    settings = {},
    zone,
    variantIndex = 0,
  } = ctx;

  const family = ctx.family || resolveFamilyForSlot(slot, DEFAULT_FAMILIES);
  const explain: ExplainStep[] = [];
  const flags: string[] = [];

  // 1. Resolve Variant
  let activeVariant: Variant;
  if (ctx.selectedVariantId && family.k[ctx.selectedVariantId]) {
    activeVariant = resolveVariantForEntry(slot, { variantId: ctx.selectedVariantId } as any, family);
  } else {
    activeVariant = resolveVariantForEntry(slot, {} as any, family);
  }

  const kPrior = family.k[activeVariant.id] ?? { value: 1.0, conf: 'low', n: 1 };
  const kVal = kPrior.value;

  if (kPrior.n < 3 && activeVariant.id !== family.canonical) {
    flags.push('первая калибровка снаряда');
  }

  // Prescription Rx
  const rx = slot.rx[zone] || slot.rx.mid || { opts: [[3, 8]] };
  const opt = rx.opts[variantIndex] || rx.opts[0] || [3, 8];
  const setsCount = opt[0];
  const repsRange = opt[1];
  const targetReps = typeof repsRange === 'number' ? repsRange : repsRange[1];

  // 2. Canonical strength mu_canon and mode
  const { e1rm: muCanon } = getCalibratedE1RM(targetReps, estimates);
  const allEstimate = estimates.all || { p: 16, mu: muCanon };
  const sd = Math.sqrt(allEstimate.p || 16);

  explain.push({
    label: 'Опорная сила',
    value: `${muCanon > 0 ? muCanon.toFixed(1) : '—'} кг (${family.name})`,
  });

  const mode = settings.mode || 'normal';
  let muMode = muCanon;
  if (mode === 'conservative') {
    muMode = Math.max(0, muCanon - 0.5 * sd);
    explain.push({ label: 'Режим', value: 'Консервативный (-0.5 SD)' });
  } else if (mode === 'aggressive') {
    muMode = muCanon + 0.25 * sd;
    explain.push({ label: 'Режим', value: 'Агрессивный (+0.25 SD)' });
  }

  const muV = muMode * kVal;
  explain.push({
    label: 'Снаряд',
    value: `${activeVariant.label}${kVal !== 1.0 ? `, k = ${kVal.toFixed(2)}` : ''}`,
  });

  // 3. Target RPE t
  let targetRpe = 8.0;
  if (rx.rpe && rx.rpe.length === 2) {
    const rpeMode = settings.rpeMode || 'mid';
    if (rpeMode === 'low') targetRpe = rx.rpe[0];
    else if (rpeMode === 'high') targetRpe = rx.rpe[1];
    else targetRpe = (rx.rpe[0] + rx.rpe[1]) / 2;
  }
  explain.push({ label: 'Цель', value: `${targetReps} повт., RPE ${targetRpe}` });

  // Warmup exercises (e.g. pullups)
  if (slot.kind === 'warmup') {
    let warmupReps = targetReps;
    // Find last logged session reps for this slot
    for (const sess of history) {
      const entry = sess.entries?.find((e) => e.slotId === slot.id && !e.skipped);
      if (entry && entry.sets) {
        const doneSets = entry.sets.filter((s) => s.done && s.reps != null && s.reps > 0);
        if (doneSets.length > 0) {
          warmupReps = doneSets[0].reps! + 1;
          break;
        }
      }
    }
    if (typeof repsRange !== 'number') {
      warmupReps = Math.min(repsRange[1], Math.max(repsRange[0], warmupReps));
    }
    return {
      weight: 0,
      reps: warmupReps,
      sets: setsCount,
      targetRpe,
      confidence: 'high',
      range: [0, 0],
      alternatives: [],
      explain: [{ label: 'Разминка', value: `${setsCount} × ${warmupReps} повт. (собственный вес)` }],
      flags: [],
      isPerHand: false,
    };
  }

  // 4. Raw weight w_raw = mu_v * pct(r + 10 - t)
  const n = targetReps + 10 - targetRpe;
  const pctVal = pct(n, settings.formula);
  let w = muV * pctVal;
  explain.push({ label: 'Доля от 1ПМ', value: `${(pctVal * 100).toFixed(1)}%` });

  // 5. Feedback adjustment from last session (same slot & variant)
  let lastSessionEntry: { sets: any[]; weight: number } | null = null;
  for (const sess of history) {
    if (sess.badDay) continue;
    const entry = sess.entries?.find(
      (e) => (e.slotId === slot.id || e.variantId === activeVariant.id) && !e.skipped
    );
    if (entry && entry.sets) {
      const workSets = entry.sets.filter((s) => s.type === 'work' && s.done && s.reps != null && s.weight != null);
      if (workSets.length > 0) {
        lastSessionEntry = { sets: workSets, weight: workSets[0].weight! };
        break;
      }
    }
  }

  if (lastSessionEntry && lastSessionEntry.sets.length > 0) {
    const ws = lastSessionEntry.sets;
    const firstSet = ws[0];
    const lastSet = ws[ws.length - 1];

    if (firstSet.reps > 0) {
      const dropOff = (firstSet.reps - lastSet.reps) / firstSet.reps;
      const firstRpe = firstSet.rpe ?? targetRpe;

      if (dropOff > 0.25 || firstRpe >= targetRpe + 1) {
        w *= 0.975; // -2.5%
        explain.push({ label: 'Поправка прошлой сессии', value: '-2.5% (спад повторов / высокий RPE)' });
      } else {
        const allReachedTop = ws.every((s) => s.reps >= targetReps && (s.rpe == null || s.rpe <= targetRpe - 1));
        if (allReachedTop) {
          w *= 1.025; // +2.5%
          explain.push({ label: 'Поправка прошлой сессии', value: '+2.5% (запас по RPE и повторам)' });
        }
      }
    }
  }

  // Isolation special logic: dampening on rep range switch & double progression
  if (slot.kind === 'isolation' && lastSessionEntry) {
    const wLast = lastSessionEntry.weight;
    if (wLast > 0 && Math.abs(w - wLast) / wLast > 0.08) {
      w = wLast * (1 + 0.7 * (w / wLast - 1));
      explain.push({ label: 'Демпфирование изоляции', value: 'Сглаживание смены диапазона' });
    }
  }

  // 6. Cap (Потолок) - only for kind === 'main'
  let capVal: number | undefined;
  let isCapped = false;
  if (slot.kind === 'main' && rx.cap != null) {
    capVal = rx.cap * muV;
    if (w > capVal) {
      w = capVal;
      isCapped = true;
    }
    explain.push({
      label: 'Потолок нагрузки',
      value: `${(rx.cap * 100).toFixed(0)}%: ${isCapped ? `сработал (${capVal.toFixed(1)} кг)` : 'не превышен'}`,
    });
  }

  // 7. Rounding according to LoadScheme & candidate selection
  const scheme = activeVariant.loadScheme;
  const { lo: cLo, hi: cHi } = getSchemeCandidates(w, scheme, capVal);

  let chosenWeight = cLo;
  if (cLo === cHi) {
    chosenWeight = cLo;
  } else {
    // Predicted RPE for both candidates: predicted RPE = 10 - (pct^-1(candidate / mu_v) - r)
    const predRpeLo = muV > 0 ? 10 - (invertPct(cLo / muV) - targetReps) : targetRpe;
    const predRpeHi = muV > 0 ? 10 - (invertPct(cHi / muV) - targetReps) : targetRpe;

    const diffLo = Math.abs(predRpeLo - targetRpe);
    const diffHi = Math.abs(predRpeHi - targetRpe);

    if (Math.abs(diffHi - diffLo) < 0.05) {
      // Tie breaker within 0.05: select lower
      chosenWeight = cLo;
    } else if (diffLo < diffHi) {
      chosenWeight = cLo;
    } else {
      chosenWeight = cHi;
    }
  }

  explain.push({
    label: 'Округление по снаряду',
    value: `${cLo} или ${cHi} → ${chosenWeight} кг`,
  });

  // 8. Confidence & Range
  const sdRel = muCanon > 0 ? sd / muCanon : 0.1;
  let confidence: 'high' | 'med' | 'low';
  if (sdRel < 0.025 && kPrior.conf !== 'low') {
    confidence = 'high';
  } else if (sdRel < 0.05) {
    confidence = 'med';
  } else {
    confidence = 'low';
  }

  const rangeDelta = 1.64 * sdRel * chosenWeight;
  const rangeLo = roundToScheme(Math.max(0, chosenWeight - rangeDelta), scheme);
  const rangeHi = roundToScheme(chosenWeight + rangeDelta, scheme);

  explain.push({
    label: 'Уверенность',
    value: confidence === 'high' ? 'Высокая' : confidence === 'med' ? 'Средняя' : 'Низкая (≈)',
  });

  // 9. Alternatives: compute same suggestion for other variants in family
  const alternatives: { variantId: string; label: string; weight: number }[] = [];
  for (const [vId, vPrior] of Object.entries(family.k)) {
    if (vId === activeVariant.id) continue;
    const altVariant = resolveVariantForEntry(slot, { variantId: vId } as any, family);
    const altMuV = muMode * vPrior.value;
    let altW = altMuV * pctVal;
    if (slot.kind === 'main' && rx.cap != null) {
      altW = Math.min(altW, rx.cap * altMuV);
    }
    const altCand = getSchemeCandidates(altW, altVariant.loadScheme, slot.kind === 'main' && rx.cap ? rx.cap * altMuV : undefined);
    alternatives.push({
      variantId: vId,
      label: altVariant.label,
      weight: altCand.lo,
    });
  }

  // Warmup sets for kind === 'main'
  let warmups: { weight: number; reps: number }[] | undefined;
  if (slot.kind === 'main' && settings.warmups !== false && chosenWeight > 0) {
    warmups = [
      { weight: roundToScheme(chosenWeight * 0.4, scheme), reps: 5 },
      { weight: roundToScheme(chosenWeight * 0.6, scheme), reps: 3 },
      { weight: roundToScheme(chosenWeight * 0.75, scheme), reps: 2 },
      { weight: roundToScheme(chosenWeight * 0.9, scheme), reps: 1 },
    ];
  }

  return {
    weight: chosenWeight,
    reps: repsRange,
    sets: setsCount,
    targetRpe,
    confidence,
    range: [rangeLo, rangeHi],
    alternatives,
    explain,
    flags,
    warmups,
    isPerHand: Boolean(activeVariant.perHand),
  };
}
