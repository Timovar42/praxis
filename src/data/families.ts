import type { Family, Variant, KPrior } from '../domain/engine2/types';

export const DEFAULT_DUMBBELL_VALUES = [
  2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32, 34, 36, 38, 40, 42, 44, 46, 48, 50,
];

const makeK = (value: number, conf: 'high' | 'med' | 'low' = 'med', n: number = 5): KPrior => ({
  value,
  conf,
  n,
});

export const INITIAL_VARIANTS: Record<string, Variant> = {
  // 1. Жим лёжа
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
  bench_machine: {
    id: 'bench_machine',
    implement: 'machine',
    label: 'Тренажёр',
    loadScheme: { type: 'stack', step: 5.0 },
  },

  // 2. Жим в наклоне
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
  incline_smith: {
    id: 'incline_smith',
    implement: 'smith',
    label: 'Смитт',
    loadScheme: { type: 'plates', bar: 20, minStep: 2.5 },
  },
  incline_hammer: {
    id: 'incline_hammer',
    implement: 'machine',
    label: 'Хаммер',
    loadScheme: { type: 'plates', bar: 0, minStep: 2.5 },
  },

  // 3. Бицепс
  biceps_barbell: {
    id: 'biceps_barbell',
    implement: 'barbell',
    label: 'Со штангой',
    loadScheme: { type: 'plates', bar: 10, minStep: 1.25 },
  },
  biceps_ezbar: {
    id: 'biceps_ezbar',
    implement: 'ezbar',
    label: 'EZ-гриф',
    loadScheme: { type: 'plates', bar: 7.5, minStep: 1.25 },
  },
  biceps_dumbbell: {
    id: 'biceps_dumbbell',
    implement: 'dumbbell',
    label: 'С гантелями',
    perHand: true,
    loadScheme: { type: 'list', values: DEFAULT_DUMBBELL_VALUES },
  },
  biceps_cable: {
    id: 'biceps_cable',
    implement: 'cable',
    label: 'В кроссовере',
    loadScheme: { type: 'stack', step: 2.5 },
  },

  // 4. Тяга к поясу (Т-гриф, тяга в наклоне, хаммер)
  row_tbar: {
    id: 'row_tbar',
    implement: 'machine',
    label: 'Т-гриф',
    loadScheme: { type: 'plates', bar: 0, minStep: 2.5 },
  },
  row_barbell: {
    id: 'row_barbell',
    implement: 'barbell',
    label: 'Тяга штанги',
    loadScheme: { type: 'plates', bar: 20, minStep: 2.5 },
  },
  row_dumbbell: {
    id: 'row_dumbbell',
    implement: 'dumbbell',
    label: 'Гантель к поясу',
    perHand: true,
    loadScheme: { type: 'list', values: DEFAULT_DUMBBELL_VALUES },
  },
  row_machine: {
    id: 'row_machine',
    implement: 'machine',
    label: 'Хаммер / тренажёр',
    loadScheme: { type: 'stack', step: 5.0 },
  },

  // 5. Присед
  squat_barbell: {
    id: 'squat_barbell',
    implement: 'barbell',
    label: 'Со штангой',
    loadScheme: { type: 'plates', bar: 20, minStep: 2.5 },
  },
  squat_smith: {
    id: 'squat_smith',
    implement: 'smith',
    label: 'В Смитте',
    loadScheme: { type: 'plates', bar: 20, minStep: 2.5 },
  },

  // 6. Становая тяга
  deadlift_barbell: {
    id: 'deadlift_barbell',
    implement: 'barbell',
    label: 'Со штангой',
    loadScheme: { type: 'plates', bar: 20, minStep: 2.5 },
  },
  deadlift_trapbar: {
    id: 'deadlift_trapbar',
    implement: 'trapbar',
    label: 'Трэп-гриф',
    loadScheme: { type: 'plates', bar: 25, minStep: 2.5 },
  },

  // 7. Румынская тяга
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

  // 8. Жим ног
  leg_press_machine: {
    id: 'leg_press_machine',
    implement: 'machine',
    label: 'Жим ног',
    loadScheme: { type: 'plates', bar: 0, minStep: 5.0 },
  },

  // 9. Гакк-присед
  hack_squat_machine: {
    id: 'hack_squat_machine',
    implement: 'machine',
    label: 'В гакке',
    loadScheme: { type: 'plates', bar: 0, minStep: 5.0 },
  },

  // 10. Разгибания ног
  leg_ext_machine: {
    id: 'leg_ext_machine',
    implement: 'machine',
    label: 'Разгибания ног',
    loadScheme: { type: 'stack', step: 2.5 },
  },

  // 11. Сгибания ног
  leg_curl_machine: {
    id: 'leg_curl_machine',
    implement: 'machine',
    label: 'Сгибания ног',
    loadScheme: { type: 'stack', step: 2.5 },
  },

  // 12. Махи на среднюю дельту
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

  // 13. Махи на заднюю дельту
  rear_delt_machine: {
    id: 'rear_delt_machine',
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

  // 14. Трицепс на блоке
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

  // 15. Вертикальная тяга
  lat_pulldown_machine: {
    id: 'lat_pulldown_machine',
    implement: 'cable',
    label: 'Вертикальная тяга',
    loadScheme: { type: 'stack', step: 5.0 },
  },

  // 16. Шраги
  shrugs_barbell: {
    id: 'shrugs_barbell',
    implement: 'barbell',
    label: 'Со штангой',
    loadScheme: { type: 'plates', bar: 20, minStep: 2.5 },
  },
  shrugs_dumbbell: {
    id: 'shrugs_dumbbell',
    implement: 'dumbbell',
    label: 'С гантелями',
    perHand: true,
    loadScheme: { type: 'list', values: DEFAULT_DUMBBELL_VALUES },
  },

  // 17. Подтягивания (kind = warmup)
  pullups_bodyweight: {
    id: 'pullups_bodyweight',
    implement: 'bodyweight',
    label: 'Собственный вес',
    loadScheme: { type: 'plates', bar: 0, minStep: 1.25 },
  },

  // 18. Разгибания рук из-за головы
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
};

export interface FamilyConfig extends Family {
  crossPrior?: {
    targetFamilyId: string;
    ratio: number;
    conf: 'high' | 'med' | 'low';
  };
}

export const INITIAL_FAMILIES: Record<string, FamilyConfig> = {
  bench: {
    id: 'bench',
    name: 'Жим лёжа',
    canonical: 'bench_barbell',
    k: {
      bench_barbell: makeK(1.0, 'high', 100),
      bench_dumbbell: makeK(0.38, 'med', 3), // на руку 0.38 (med)
      bench_smith: makeK(0.95, 'low', 1), // smith 0.95 (low)
      bench_machine: makeK(0.90, 'low', 1), // machine 0.90 (low)
    },
  },
  incline_press: {
    id: 'incline_press',
    name: 'Жим в наклоне',
    canonical: 'incline_barbell',
    crossPrior: {
      targetFamilyId: 'bench',
      ratio: 0.82, // приор к жиму лёжа 0.82 (low)
      conf: 'low',
    },
    k: {
      incline_barbell: makeK(1.0, 'high', 100),
      incline_dumbbell: makeK(0.38, 'med', 3), // на руку 0.38 (med)
      incline_smith: makeK(0.95, 'low', 1), // smith 0.95 (low)
      incline_hammer: makeK(0.90, 'low', 1),
    },
  },
  biceps: {
    id: 'biceps',
    name: 'Бицепс',
    canonical: 'biceps_barbell',
    k: {
      biceps_barbell: makeK(1.0, 'high', 100),
      biceps_ezbar: makeK(0.95, 'med', 3), // ezbar 0.95 (med)
      biceps_dumbbell: makeK(0.42, 'med', 3), // dumbbell на руку 0.42 (med)
      biceps_cable: makeK(0.80, 'low', 1), // cable 0.80 (low)
    },
  },
  t_bar: {
    id: 't_bar',
    name: 'Тяга к поясу',
    canonical: 'row_tbar',
    k: {
      row_tbar: makeK(1.0, 'high', 100), // Т-гриф или barbell 1.00 (канон)
      row_barbell: makeK(1.0, 'high', 50),
      row_dumbbell: makeK(0.45, 'low', 1), // dumbbell на руку 0.45 (low)
      row_machine: makeK(0.90, 'low', 1), // machine 0.90 (low)
    },
  },
  squat: {
    id: 'squat',
    name: 'Присед',
    canonical: 'squat_barbell',
    k: {
      squat_barbell: makeK(1.0, 'high', 100),
      squat_smith: makeK(0.90, 'low', 1), // smith 0.90 (low)
    },
  },
  deadlift: {
    id: 'deadlift',
    name: 'Становая тяга',
    canonical: 'deadlift_barbell',
    k: {
      deadlift_barbell: makeK(1.0, 'high', 100),
      deadlift_trapbar: makeK(1.05, 'low', 1), // trapbar 1.05 (low)
    },
  },
  rdl: {
    id: 'rdl',
    name: 'Румынская тяга',
    canonical: 'rdl_barbell',
    crossPrior: {
      targetFamilyId: 'deadlift',
      ratio: 0.65, // приор к становой 0.65 (low)
      conf: 'low',
    },
    k: {
      rdl_barbell: makeK(1.0, 'high', 100),
      rdl_dumbbell: makeK(0.40, 'low', 1), // dumbbell на руку 0.40 (low)
    },
  },
  leg_press: {
    id: 'leg_press',
    name: 'Жим ног',
    canonical: 'leg_press_machine',
    k: {
      leg_press_machine: makeK(1.0, 'high', 100),
    },
  },
  hack_squat: {
    id: 'hack_squat',
    name: 'Гакк-присед',
    canonical: 'hack_squat_machine',
    k: {
      hack_squat_machine: makeK(1.0, 'high', 100),
    },
  },
  leg_ext: {
    id: 'leg_ext',
    name: 'Разгибания ног',
    canonical: 'leg_ext_machine',
    k: {
      leg_ext_machine: makeK(1.0, 'high', 100),
    },
  },
  leg_curl: {
    id: 'leg_curl',
    name: 'Сгибания ног',
    canonical: 'leg_curl_machine',
    k: {
      leg_curl_machine: makeK(1.0, 'high', 100),
    },
  },
  side_delt: {
    id: 'side_delt',
    name: 'Махи на среднюю дельту',
    canonical: 'side_delt_db',
    k: {
      side_delt_db: makeK(1.0, 'high', 100),
      side_delt_cable: makeK(0.85, 'med', 5),
    },
  },
  rear_delt: {
    id: 'rear_delt',
    name: 'Махи на заднюю дельту',
    canonical: 'rear_delt_machine',
    k: {
      rear_delt_machine: makeK(1.0, 'high', 100),
      rear_delt_cable: makeK(0.85, 'med', 5),
    },
  },
  tri_cable: {
    id: 'tri_cable',
    name: 'Трицепс на блоке',
    canonical: 'tri_cable_rope',
    k: {
      tri_cable_rope: makeK(1.0, 'high', 100),
      tri_cable_straight: makeK(1.15, 'med', 5),
    },
  },
  tri_ext: {
    id: 'tri_ext',
    name: 'Разгибания рук из-за головы',
    canonical: 'tri_ext_db_1h',
    k: {
      tri_ext_db_1h: makeK(1.0, 'high', 100),
      tri_ext_db_2h_seated: makeK(1.85, 'med', 5),
      tri_ext_db_lying: makeK(1.60, 'med', 5),
    },
  },
  lat_pulldown: {
    id: 'lat_pulldown',
    name: 'Вертикальная тяга',
    canonical: 'lat_pulldown_machine',
    k: {
      lat_pulldown_machine: makeK(1.0, 'high', 100),
    },
  },
  shrugs: {
    id: 'shrugs',
    name: 'Шраги',
    canonical: 'shrugs_barbell',
    k: {
      shrugs_barbell: makeK(1.0, 'high', 100),
      shrugs_dumbbell: makeK(0.40, 'low', 1),
    },
  },
  pullups: {
    id: 'pullups',
    name: 'Подтягивания',
    canonical: 'pullups_bodyweight',
    k: {
      pullups_bodyweight: makeK(1.0, 'high', 100),
    },
  },
};
