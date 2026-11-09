import type { Family, Variant, KPrior } from './types';
import type { Slot, ExerciseLog } from '../types';

export const DEFAULT_DUMBBELL_VALUES = [
  2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32, 34, 36, 38, 40, 42, 44, 46, 48, 50,
];

export const DEFAULT_VARIANTS: Record<string, Variant> = {
  // Bench press
  bench_barbell: {
    id: 'bench_barbell',
    implement: 'barbell',
    label: 'Со штангой',
    loadScheme: { type: 'plates', bar: 20, minStep: 2.5 },
  },
  bench_dumbbell: {
    id: 'bench_dumbbell',
    implement: 'dumbbell',
    label: 'С гантелями',
    perHand: true,
    loadScheme: { type: 'list', values: DEFAULT_DUMBBELL_VALUES },
  },
  bench_smith: {
    id: 'bench_smith',
    implement: 'smith',
    label: 'В Смитте',
    loadScheme: { type: 'plates', bar: 20, minStep: 2.5 },
  },

  // Incline press
  incline_barbell: {
    id: 'incline_barbell',
    implement: 'barbell',
    label: 'Со штангой',
    loadScheme: { type: 'plates', bar: 20, minStep: 2.5 },
  },
  incline_dumbbell: {
    id: 'incline_dumbbell',
    implement: 'dumbbell',
    label: 'С гантелями',
    perHand: true,
    loadScheme: { type: 'list', values: DEFAULT_DUMBBELL_VALUES },
  },
  incline_hammer: {
    id: 'incline_hammer',
    implement: 'machine',
    label: 'Хаммер',
    loadScheme: { type: 'plates', bar: 0, minStep: 2.5 },
  },
  incline_smith: {
    id: 'incline_smith',
    implement: 'smith',
    label: 'Смитт',
    loadScheme: { type: 'plates', bar: 20, minStep: 2.5 },
  },

  // Squat
  squat_barbell: {
    id: 'squat_barbell',
    implement: 'barbell',
    label: 'Со штангой',
    loadScheme: { type: 'plates', bar: 20, minStep: 2.5 },
  },
  squat_hack: {
    id: 'squat_hack',
    implement: 'machine',
    label: 'В гакке',
    loadScheme: { type: 'plates', bar: 0, minStep: 2.5 },
  },
  squat_well: {
    id: 'squat_well',
    implement: 'machine',
    label: 'В колодце',
    loadScheme: { type: 'plates', bar: 0, minStep: 2.5 },
  },
  squat_legpress: {
    id: 'squat_legpress',
    implement: 'machine',
    label: 'Жим ног',
    loadScheme: { type: 'plates', bar: 0, minStep: 5.0 },
  },

  // Deadlift
  deadlift_barbell: {
    id: 'deadlift_barbell',
    implement: 'barbell',
    label: 'Классическая со штангой',
    loadScheme: { type: 'plates', bar: 20, minStep: 2.5 },
  },
  deadlift_sumo: {
    id: 'deadlift_sumo',
    implement: 'barbell',
    label: 'Сумо со штангой',
    loadScheme: { type: 'plates', bar: 20, minStep: 2.5 },
  },
  deadlift_blocks: {
    id: 'deadlift_blocks',
    implement: 'barbell',
    label: 'С плинтов',
    loadScheme: { type: 'plates', bar: 20, minStep: 2.5 },
  },

  // RDL
  rdl_barbell: {
    id: 'rdl_barbell',
    implement: 'barbell',
    label: 'Со штангой',
    loadScheme: { type: 'plates', bar: 20, minStep: 2.5 },
  },
  rdl_dumbbell: {
    id: 'rdl_dumbbell',
    implement: 'dumbbell',
    label: 'С гантелями',
    perHand: true,
    loadScheme: { type: 'list', values: DEFAULT_DUMBBELL_VALUES },
  },

  // Biceps
  biceps_barbell: {
    id: 'biceps_barbell',
    implement: 'barbell',
    label: 'Со штангой',
    loadScheme: { type: 'plates', bar: 10, minStep: 1.25 },
  },
  biceps_strict: {
    id: 'biceps_strict',
    implement: 'barbell',
    label: 'Строгий со штангой',
    loadScheme: { type: 'plates', bar: 10, minStep: 1.25 },
  },
  biceps_db_standing: {
    id: 'biceps_db_standing',
    implement: 'dumbbell',
    label: 'С гантелями стоя',
    perHand: true,
    loadScheme: { type: 'list', values: DEFAULT_DUMBBELL_VALUES },
  },
  biceps_db_seated: {
    id: 'biceps_db_seated',
    implement: 'dumbbell',
    label: 'С гантелями сидя',
    perHand: true,
    loadScheme: { type: 'list', values: DEFAULT_DUMBBELL_VALUES },
  },

  // Hammer curl
  hammer_db_standing: {
    id: 'hammer_db_standing',
    implement: 'dumbbell',
    label: 'С гантелями стоя',
    perHand: true,
    loadScheme: { type: 'list', values: DEFAULT_DUMBBELL_VALUES },
  },
  hammer_db_seated: {
    id: 'hammer_db_seated',
    implement: 'dumbbell',
    label: 'С гантелями сидя',
    perHand: true,
    loadScheme: { type: 'list', values: DEFAULT_DUMBBELL_VALUES },
  },
  hammer_cable_1h: {
    id: 'hammer_cable_1h',
    implement: 'cable',
    label: 'В кроссовере 1 рукой',
    perHand: true,
    loadScheme: { type: 'stack', step: 2.5 },
  },
  hammer_cable_2h: {
    id: 'hammer_cable_2h',
    implement: 'cable',
    label: 'В кроссовере 2 руками',
    loadScheme: { type: 'stack', step: 5.0 },
  },
  hammer_preacher: {
    id: 'hammer_preacher',
    implement: 'dumbbell',
    label: 'Скамья Скотта',
    perHand: true,
    loadScheme: { type: 'list', values: DEFAULT_DUMBBELL_VALUES },
  },

  // Triceps overhead extension: canonical dumbbell perHand
  tri_ext_db_1h: {
    id: 'tri_ext_db_1h',
    implement: 'dumbbell',
    label: 'С 1 гантелью',
    perHand: true,
    loadScheme: { type: 'list', values: DEFAULT_DUMBBELL_VALUES },
  },
  tri_ext_db_2h_seated: {
    id: 'tri_ext_db_2h_seated',
    implement: 'dumbbell',
    label: '2-мя гантелями из-за головы сидя',
    loadScheme: { type: 'list', values: DEFAULT_DUMBBELL_VALUES },
  },
  tri_ext_db_lying: {
    id: 'tri_ext_db_lying',
    implement: 'dumbbell',
    label: 'С 2 гантелями лёжа',
    perHand: true,
    loadScheme: { type: 'list', values: DEFAULT_DUMBBELL_VALUES },
  },

  // Triceps cable pushdown
  tri_cable_rope: {
    id: 'tri_cable_rope',
    implement: 'cable',
    label: 'С косичкой',
    loadScheme: { type: 'stack', step: 2.5 },
  },
  tri_cable_straight: {
    id: 'tri_cable_straight',
    implement: 'cable',
    label: 'С прямой рукояткой',
    loadScheme: { type: 'stack', step: 2.5 },
  },
  tri_cable_1h: {
    id: 'tri_cable_1h',
    implement: 'cable',
    label: '1 рукой',
    perHand: true,
    loadScheme: { type: 'stack', step: 2.5 },
  },

  // Lateral delts
  side_delt_db: {
    id: 'side_delt_db',
    implement: 'dumbbell',
    label: 'С гантелями',
    perHand: true,
    loadScheme: { type: 'list', values: DEFAULT_DUMBBELL_VALUES },
  },
  side_delt_cable: {
    id: 'side_delt_cable',
    implement: 'cable',
    label: 'В кроссовере',
    loadScheme: { type: 'stack', step: 2.5 },
  },
  side_delt_shrug: {
    id: 'side_delt_shrug',
    implement: 'barbell',
    label: 'Шраги со штангой',
    loadScheme: { type: 'plates', bar: 20, minStep: 2.5 },
  },

  // Rear delts
  rear_delt_lever: {
    id: 'rear_delt_lever',
    implement: 'machine',
    label: 'В рычажном блоке',
    loadScheme: { type: 'stack', step: 2.5 },
  },
  rear_delt_cable: {
    id: 'rear_delt_cable',
    implement: 'cable',
    label: 'В кроссовере',
    loadScheme: { type: 'stack', step: 2.5 },
  },

  // Leg press / hack
  leg_press_machine: {
    id: 'leg_press_machine',
    implement: 'machine',
    label: 'Жим ног',
    loadScheme: { type: 'plates', bar: 0, minStep: 5.0 },
  },
  leg_press_hack: {
    id: 'leg_press_hack',
    implement: 'machine',
    label: 'В гакке',
    loadScheme: { type: 'plates', bar: 0, minStep: 5.0 },
  },

  // Leg curl
  leg_curl_lying: {
    id: 'leg_curl_lying',
    implement: 'machine',
    label: 'Лёжа',
    loadScheme: { type: 'stack', step: 2.5 },
  },
  leg_curl_seated: {
    id: 'leg_curl_seated',
    implement: 'machine',
    label: 'Сидя',
    loadScheme: { type: 'stack', step: 2.5 },
  },

  // Leg extension
  leg_ext_machine: {
    id: 'leg_ext_machine',
    implement: 'machine',
    label: 'Тренажер разгибания ног',
    loadScheme: { type: 'stack', step: 2.5 },
  },
  leg_ext_legpress: {
    id: 'leg_ext_legpress',
    implement: 'machine',
    label: 'Жим ног',
    loadScheme: { type: 'plates', bar: 0, minStep: 5.0 },
  },
  leg_ext_lunges_smith: {
    id: 'leg_ext_lunges_smith',
    implement: 'smith',
    label: 'Выпады в смитте',
    loadScheme: { type: 'plates', bar: 20, minStep: 2.5 },
  },

  // Pullups
  pullups_bodyweight: {
    id: 'pullups_bodyweight',
    implement: 'bodyweight',
    label: 'Собственный вес',
    loadScheme: { type: 'plates', bar: 0, minStep: 1.25 },
  },
  pullups_weighted: {
    id: 'pullups_weighted',
    implement: 'bodyweight',
    label: 'С весом',
    loadScheme: { type: 'plates', bar: 0, minStep: 1.25 },
  },
  pullups_gravitron: {
    id: 'pullups_gravitron',
    implement: 'machine',
    label: 'В гравитроне',
    loadScheme: { type: 'stack', step: 5.0 },
  },

  // Dips
  dips_bodyweight: {
    id: 'dips_bodyweight',
    implement: 'bodyweight',
    label: 'Собственный вес',
    loadScheme: { type: 'plates', bar: 0, minStep: 1.25 },
  },
  dips_weighted: {
    id: 'dips_weighted',
    implement: 'bodyweight',
    label: 'С весом',
    loadScheme: { type: 'plates', bar: 0, minStep: 1.25 },
  },
  dips_gravitron: {
    id: 'dips_gravitron',
    implement: 'machine',
    label: 'В гравитроне',
    loadScheme: { type: 'stack', step: 5.0 },
  },

  // T-bar row
  t_bar_machine: {
    id: 't_bar_machine',
    implement: 'machine',
    label: 'Т-гриф',
    loadScheme: { type: 'plates', bar: 0, minStep: 2.5 },
  },
  t_bar_barbell_row: {
    id: 't_bar_barbell_row',
    implement: 'barbell',
    label: 'Тяга штанги',
    loadScheme: { type: 'plates', bar: 20, minStep: 2.5 },
  },
  t_bar_seated_row: {
    id: 't_bar_seated_row',
    implement: 'cable',
    label: 'Горизонтальная тяга',
    loadScheme: { type: 'stack', step: 5.0 },
  },

  // Pullover
  pullover_db: {
    id: 'pullover_db',
    implement: 'dumbbell',
    label: 'Гантели',
    loadScheme: { type: 'list', values: DEFAULT_DUMBBELL_VALUES },
  },
  pullover_cable: {
    id: 'pullover_cable',
    implement: 'cable',
    label: 'Кроссовер',
    loadScheme: { type: 'stack', step: 2.5 },
  },

  // Lat pulldown
  lat_pulldown_wide: {
    id: 'lat_pulldown_wide',
    implement: 'cable',
    label: 'Широким хватом',
    loadScheme: { type: 'stack', step: 5.0 },
  },
  lat_pulldown_parallel: {
    id: 'lat_pulldown_parallel',
    implement: 'cable',
    label: 'Параллельным хватом',
    loadScheme: { type: 'stack', step: 5.0 },
  },
  lat_pulldown_underhand: {
    id: 'lat_pulldown_underhand',
    implement: 'cable',
    label: 'Обратным хватом',
    loadScheme: { type: 'stack', step: 5.0 },
  },

  // Seated row
  seated_row_vbar: {
    id: 'seated_row_vbar',
    implement: 'cable',
    label: 'V-рукоять',
    loadScheme: { type: 'stack', step: 5.0 },
  },
  seated_row_wide: {
    id: 'seated_row_wide',
    implement: 'cable',
    label: 'Широкий хват',
    loadScheme: { type: 'stack', step: 5.0 },
  },

  // Calves
  calf_standing_barbell: {
    id: 'calf_standing_barbell',
    implement: 'barbell',
    label: 'Стоя со штангой',
    loadScheme: { type: 'plates', bar: 20, minStep: 2.5 },
  },
  calf_standing_machine: {
    id: 'calf_standing_machine',
    implement: 'machine',
    label: 'В тренажере стоя',
    loadScheme: { type: 'stack', step: 5.0 },
  },
  calf_seated_machine: {
    id: 'calf_seated_machine',
    implement: 'machine',
    label: 'В тренажере сидя',
    loadScheme: { type: 'stack', step: 5.0 },
  },

  // Abs
  abs_bodyweight: {
    id: 'abs_bodyweight',
    implement: 'bodyweight',
    label: 'Скручивания',
    loadScheme: { type: 'plates', bar: 0, minStep: 1.0 },
  },
  abs_hanging_leg_raise: {
    id: 'abs_hanging_leg_raise',
    implement: 'bodyweight',
    label: 'Подъемы ног в висе',
    loadScheme: { type: 'plates', bar: 0, minStep: 1.0 },
  },
  abs_cable_crunch: {
    id: 'abs_cable_crunch',
    implement: 'cable',
    label: 'Молитва на блоке',
    loadScheme: { type: 'stack', step: 2.5 },
  },

  // Hyperextension
  hyperextension_bodyweight: {
    id: 'hyperextension_bodyweight',
    implement: 'bodyweight',
    label: 'Без веса',
    loadScheme: { type: 'plates', bar: 0, minStep: 1.25 },
  },
  hyperextension_weighted: {
    id: 'hyperextension_weighted',
    implement: 'bodyweight',
    label: 'С весом',
    loadScheme: { type: 'plates', bar: 0, minStep: 1.25 },
  },
};

const makeK = (value: number, conf: 'high' | 'med' | 'low' = 'med', n: number = 10): KPrior => ({
  value,
  conf,
  n,
});

export const DEFAULT_FAMILIES: Record<string, Family> = {
  bench: {
    id: 'bench',
    name: 'Жим лёжа',
    canonical: 'bench_barbell',
    k: {
      bench_barbell: makeK(1.0, 'high', 100),
      bench_dumbbell: makeK(0.36, 'med', 15),
      bench_smith: makeK(1.05, 'med', 10),
    },
  },
  incline_press: {
    id: 'incline_press',
    name: 'Жим в наклоне',
    canonical: 'incline_barbell',
    k: {
      incline_barbell: makeK(1.0, 'high', 100),
      incline_dumbbell: makeK(0.38, 'med', 15),
      incline_hammer: makeK(1.0, 'med', 10),
      incline_smith: makeK(1.05, 'med', 10),
    },
  },
  squat: {
    id: 'squat',
    name: 'Присед',
    canonical: 'squat_barbell',
    k: {
      squat_barbell: makeK(1.0, 'high', 100),
      squat_hack: makeK(1.25, 'med', 10),
      squat_well: makeK(1.10, 'med', 10),
      squat_legpress: makeK(2.20, 'med', 10),
    },
  },
  deadlift: {
    id: 'deadlift',
    name: 'Становая тяга',
    canonical: 'deadlift_barbell',
    k: {
      deadlift_barbell: makeK(1.0, 'high', 100),
      deadlift_sumo: makeK(1.0, 'high', 30),
      deadlift_blocks: makeK(1.1, 'med', 10),
    },
  },
  rdl: {
    id: 'rdl',
    name: 'Румынская тяга',
    canonical: 'rdl_barbell',
    k: {
      rdl_barbell: makeK(1.0, 'high', 100),
      rdl_dumbbell: makeK(0.38, 'med', 15),
    },
  },
  biceps: {
    id: 'biceps',
    name: 'Сгибания на бицепс',
    canonical: 'biceps_barbell',
    k: {
      biceps_barbell: makeK(1.0, 'high', 100),
      biceps_strict: makeK(0.92, 'high', 20),
      biceps_db_standing: makeK(0.42, 'med', 15),
      biceps_db_seated: makeK(0.40, 'med', 15),
    },
  },
  hammer_curl: {
    id: 'hammer_curl',
    name: 'Молотки',
    canonical: 'hammer_db_standing',
    k: {
      hammer_db_standing: makeK(1.0, 'high', 100),
      hammer_db_seated: makeK(0.95, 'high', 20),
      hammer_cable_1h: makeK(0.45, 'med', 15),
      hammer_cable_2h: makeK(0.90, 'med', 15),
      hammer_preacher: makeK(0.85, 'med', 10),
    },
  },
  tri_ext: {
    id: 'tri_ext',
    name: 'Разгибания рук из-за головы',
    canonical: 'tri_ext_db_1h',
    k: {
      tri_ext_db_1h: makeK(1.0, 'high', 100),
      tri_ext_db_2h_seated: makeK(1.85, 'med', 15),
      tri_ext_db_lying: makeK(1.60, 'med', 15),
    },
  },
  tri_cable: {
    id: 'tri_cable',
    name: 'Разгибания рук в кроссовере',
    canonical: 'tri_cable_rope',
    k: {
      tri_cable_rope: makeK(1.0, 'high', 100),
      tri_cable_straight: makeK(1.15, 'med', 15),
      tri_cable_1h: makeK(0.48, 'med', 15),
    },
  },
  side_delt: {
    id: 'side_delt',
    name: 'Махи на среднюю дельту',
    canonical: 'side_delt_db',
    k: {
      side_delt_db: makeK(1.0, 'high', 100),
      side_delt_cable: makeK(0.85, 'med', 15),
      side_delt_shrug: makeK(7.0, 'low', 5),
    },
  },
  rear_delt: {
    id: 'rear_delt',
    name: 'Махи на заднюю дельту',
    canonical: 'rear_delt_lever',
    k: {
      rear_delt_lever: makeK(1.0, 'high', 100),
      rear_delt_cable: makeK(0.85, 'med', 15),
    },
  },
  leg_press: {
    id: 'leg_press',
    name: 'Жим ног',
    canonical: 'leg_press_machine',
    k: {
      leg_press_machine: makeK(1.0, 'high', 100),
      leg_press_hack: makeK(0.65, 'med', 15),
    },
  },
  leg_curl: {
    id: 'leg_curl',
    name: 'Сгибания ног',
    canonical: 'leg_curl_lying',
    k: {
      leg_curl_lying: makeK(1.0, 'high', 100),
      leg_curl_seated: makeK(1.05, 'med', 15),
    },
  },
  leg_ext: {
    id: 'leg_ext',
    name: 'Разгибания ног',
    canonical: 'leg_ext_machine',
    k: {
      leg_ext_machine: makeK(1.0, 'high', 100),
      leg_ext_legpress: makeK(2.2, 'med', 10),
      leg_ext_lunges_smith: makeK(1.2, 'med', 10),
    },
  },
  pullups: {
    id: 'pullups',
    name: 'Подтягивания',
    canonical: 'pullups_bodyweight',
    k: {
      pullups_bodyweight: makeK(1.0, 'high', 100),
      pullups_weighted: makeK(1.0, 'high', 30),
      pullups_gravitron: makeK(0.6, 'med', 10),
    },
  },
  dips: {
    id: 'dips',
    name: 'Брусья',
    canonical: 'dips_bodyweight',
    k: {
      dips_bodyweight: makeK(1.0, 'high', 100),
      dips_weighted: makeK(1.0, 'high', 30),
      dips_gravitron: makeK(0.6, 'med', 10),
    },
  },
  t_bar: {
    id: 't_bar',
    name: 'Т-гриф',
    canonical: 't_bar_machine',
    k: {
      t_bar_machine: makeK(1.0, 'high', 100),
      t_bar_barbell_row: makeK(0.95, 'med', 15),
      t_bar_seated_row: makeK(0.90, 'med', 15),
    },
  },
  pullover: {
    id: 'pullover',
    name: 'Пулловер',
    canonical: 'pullover_db',
    k: {
      pullover_db: makeK(1.0, 'high', 100),
      pullover_cable: makeK(0.90, 'med', 15),
    },
  },
  lat_pulldown: {
    id: 'lat_pulldown',
    name: 'Тяга верхнего блока',
    canonical: 'lat_pulldown_wide',
    k: {
      lat_pulldown_wide: makeK(1.0, 'high', 100),
      lat_pulldown_parallel: makeK(1.05, 'med', 15),
      lat_pulldown_underhand: makeK(1.05, 'med', 15),
    },
  },
  seated_row: {
    id: 'seated_row',
    name: 'Горизонтальная тяга',
    canonical: 'seated_row_vbar',
    k: {
      seated_row_vbar: makeK(1.0, 'high', 100),
      seated_row_wide: makeK(0.95, 'med', 15),
    },
  },
  calf_raise: {
    id: 'calf_raise',
    name: 'Икры',
    canonical: 'calf_standing_barbell',
    k: {
      calf_standing_barbell: makeK(1.0, 'high', 100),
      calf_standing_machine: makeK(1.0, 'med', 15),
      calf_seated_machine: makeK(0.5, 'med', 15),
    },
  },
  abs: {
    id: 'abs',
    name: 'Пресс',
    canonical: 'abs_bodyweight',
    k: {
      abs_bodyweight: makeK(1.0, 'high', 100),
      abs_hanging_leg_raise: makeK(1.0, 'high', 30),
      abs_cable_crunch: makeK(1.5, 'med', 15),
    },
  },
  hyperextension: {
    id: 'hyperextension',
    name: 'Гиперэкстензия',
    canonical: 'hyperextension_bodyweight',
    k: {
      hyperextension_bodyweight: makeK(1.0, 'high', 100),
      hyperextension_weighted: makeK(1.0, 'med', 20),
    },
  },
};

/**
 * Resolves or creates a family for a given slot.
 */
export function resolveFamilyForSlot(slot: Slot, allFamilies: Record<string, Family> = DEFAULT_FAMILIES): Family {
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
  DEFAULT_VARIANTS[canonicalVariantId] = defaultVariant;

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
  if (entry.variantId && DEFAULT_VARIANTS[entry.variantId]) {
    return DEFAULT_VARIANTS[entry.variantId];
  }

  // 2. Map legacy variation string (e.g. "С гантелями", "со штангой")
  const varString = (entry.variation || '').toLowerCase().trim();
  if (varString) {
    const candidateVariantIds = Object.keys(fam.k);
    for (const vId of candidateVariantIds) {
      const v = DEFAULT_VARIANTS[vId];
      if (v) {
        const vLabel = v.label.toLowerCase().trim();
        if (vLabel === varString || varString.includes(vLabel) || vLabel.includes(varString)) {
          return v;
        }
      }
    }
  }

  // 3. Slot defaultVariant
  if (slot.defaultVariant && DEFAULT_VARIANTS[slot.defaultVariant]) {
    return DEFAULT_VARIANTS[slot.defaultVariant];
  }

  // 4. Family canonical
  if (DEFAULT_VARIANTS[fam.canonical]) {
    return DEFAULT_VARIANTS[fam.canonical];
  }

  // 5. Fallback generic variant
  return {
    id: `${fam.id}_fallback`,
    implement: 'barbell',
    label: slot.name,
    loadScheme: { type: 'plates', bar: 20, minStep: slot.inc || 2.5 },
  };
}
