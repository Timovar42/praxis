import type { Family, Variant, KPrior } from './types';
import type { Slot, ExerciseLog } from '../types';
import {
  INITIAL_FAMILIES,
  INITIAL_VARIANTS,
  DEFAULT_DUMBBELL_VALUES,
} from '../../data/families';

export { DEFAULT_DUMBBELL_VALUES, INITIAL_FAMILIES, INITIAL_VARIANTS };
export const DEFAULT_FAMILIES = INITIAL_FAMILIES;
export const DEFAULT_VARIANTS = INITIAL_VARIANTS;

/**
 * 3.1 Обучение k.
 * Пока у варианта k.n < 3, наблюдение на нём не обновляет mu семьи, а только калибрует k:
 *   k_obs = z_raw / mu_canon⁻ (z_raw считается в введённых единицах варианта)
 *   k_new = exp(0.7 * ln(k) + 0.3 * ln(k_obs))
 *   изменение за обновление не более ±15%
 *   итог в пределах ±40% от приора
 *   k.n += 1
 *   При k.n = 1 conf = low, при 3 conf = med, при 5 conf = high (если не был выше).
 *   Если у семьи ещё нет mu, первое наблюдение любого варианта задаёт канон.
 *   После k.n ≥ 3 вариант обновляет mu как обычно (раздел 2.4), а k дообучается с коэффициентом 0.1.
 */
export function learnK(
  currentK: KPrior,
  priorKValue: number,
  zRaw: number,
  muCanonMinus: number
): { k: KPrior; shouldUpdateMu: boolean } {
  // Canonical variant k is constant 1.0
  if (priorKValue === 1.0 && currentK.value === 1.0) {
    return { k: currentK, shouldUpdateMu: true };
  }

  if (muCanonMinus <= 0 || zRaw <= 0) {
    return { k: currentK, shouldUpdateMu: currentK.n >= 3 };
  }

  const kObs = zRaw / muCanonMinus;
  const isEarlyPhase = currentK.n < 3;
  const alpha = isEarlyPhase ? 0.3 : 0.1;

  // k_new = exp((1 - alpha) * ln(k) + alpha * ln(k_obs))
  const logKTarget = (1 - alpha) * Math.log(currentK.value) + alpha * Math.log(kObs);
  const kCand = Math.exp(logKTarget);

  // Clamped per update: at most ±15% change
  const minUpdate = currentK.value * 0.85;
  const maxUpdate = currentK.value * 1.15;
  const kClampedUpdate = Math.max(minUpdate, Math.min(maxUpdate, kCand));

  // Clamped within ±40% of initial prior
  const minPrior = priorKValue * 0.6;
  const maxPrior = priorKValue * 1.4;
  const kFinal = Math.max(minPrior, Math.min(maxPrior, kClampedUpdate));

  const newN = currentK.n + 1;
  let newConf: 'high' | 'med' | 'low' = currentK.conf;

  // Confidence progression
  if (newN >= 5) {
    newConf = 'high';
  } else if (newN >= 3) {
    if (newConf === 'low') newConf = 'med';
  } else {
    if (newConf !== 'high' && newConf !== 'med') newConf = 'low';
  }

  return {
    k: {
      value: kFinal,
      conf: newConf,
      n: newN,
    },
    shouldUpdateMu: !isEarlyPhase,
  };
}

/**
 * Resolves or creates a family for a given slot.
 */
export function resolveFamilyForSlot(
  slot: Slot,
  allFamilies: Record<string, Family> = INITIAL_FAMILIES
): Family {
  const familyId = slot.familyId || slot.lift;
  if (familyId && allFamilies[familyId]) {
    return allFamilies[familyId];
  }
  // Fallback by lift or name
  for (const [key, fam] of Object.entries(allFamilies)) {
    if (slot.lift === key || slot.id.startsWith(key)) {
      return fam;
    }
  }

  // Ad-hoc fallback family
  const fallbackId = `adhoc_${slot.id}`;
  const canonicalVariantId = `${fallbackId}_default`;
  const defaultVariant: Variant = {
    id: canonicalVariantId,
    implement: 'barbell',
    label: 'Основной',
    loadScheme: { type: 'plates', bar: 20, minStep: slot.inc || 2.5 },
  };
  INITIAL_VARIANTS[canonicalVariantId] = defaultVariant;

  return {
    id: fallbackId,
    name: slot.name,
    canonical: canonicalVariantId,
    k: {
      [canonicalVariantId]: { value: 1.0, conf: 'high', n: 1 },
    },
  };
}

/**
 * Resolves a Variant object for a given slot and exercise log entry.
 */
export function resolveVariantForEntry(
  slot: Slot,
  entry: ExerciseLog,
  family?: Family
): Variant {
  const fam = family || resolveFamilyForSlot(slot);

  // 1. Direct variantId if set
  if (entry.variantId && INITIAL_VARIANTS[entry.variantId]) {
    return INITIAL_VARIANTS[entry.variantId];
  }

  // 2. Map legacy variation string (e.g. "С гантелями", "со штангой")
  const varString = (entry.variation || '').toLowerCase().trim();
  if (varString) {
    const candidateVariantIds = Object.keys(fam.k);
    for (const vId of candidateVariantIds) {
      const v = INITIAL_VARIANTS[vId];
      if (v) {
        const vLabel = v.label.toLowerCase().trim();
        if (vLabel === varString || varString.includes(vLabel) || vLabel.includes(varString)) {
          return v;
        }
      }
    }
  }

  // 3. Slot defaultVariant
  if (slot.defaultVariant && INITIAL_VARIANTS[slot.defaultVariant]) {
    return INITIAL_VARIANTS[slot.defaultVariant];
  }

  // 4. Family canonical
  if (INITIAL_VARIANTS[fam.canonical]) {
    return INITIAL_VARIANTS[fam.canonical];
  }

  // 5. Fallback generic variant
  return {
    id: `${fam.id}_fallback`,
    implement: 'barbell',
    label: slot.name,
    loadScheme: { type: 'plates', bar: 20, minStep: slot.inc || 2.5 },
  };
}
