/**
 * Available equipment/analog variations for exercises (mapped by lift/slot key)
 */
export const EXERCISE_VARIATIONS: Record<string, string[]> = {
  squat: ['Со штангой', 'В гакке', 'В колодце', 'Жим ног'],
  rear_delt: ['В рычажном блоке', 'В кроссовере'],
  leg_ext: ['Тренажёр разгибания', 'Жим ног', 'Выпады в смитте'],
  bench: ['Со штангой', 'С гантелями'],
  incline: ['Со штангой', 'С гантелями', 'Хаммер', 'Смитт'],
  tbar: ['Т-гриф', 'Тяга штанги', 'Горизонтальная тяга'],
  pullover: ['С гантелью', 'В кроссовере'],
  curl: ['Со штангой', 'Строгий со штангой', 'С гантелями стоя', 'С гантелями сидя'],
  hammer: [
    'С гантелями стоя',
    'С гантелями сидя',
    'В кроссовере 1 рукой',
    'В кроссовере 2 руками',
    'Скамья Скотта',
  ],
  oh_ext: [
    'С 1 гантелью сидя',
    'С 2 гантелями из-за головы сидя',
    'С 2 гантелями лёжа',
  ],
  tri_cable: ['С косичкой', 'С прямой рукояткой', '1 рукой'],
  side_delt: ['С гантелями', 'В кроссовере'],
  deadlift: ['Классическая со штангой', 'Сумо со штангой', 'С плинтов'],
  rdl: ['Со штангой', 'С гантелями'],
  hammer_row: ['В хаммере 2 руками', 'В хаммере поочередно'],
  v_pulldown: ['Широким хватом к груди', 'Параллельным хватом', 'Обратным хватом'],
  leg_press: ['Жим платформ 45°', 'Гакк-присед', 'Жим 1 ногой'],
  leg_curl: ['Лежа в тренажёре', 'Сидя в тренажёре', 'Стоя поочередно'],
  shrugs: ['С гантелями', 'Со штангой', 'В смитте'],
  pullups: ['Широким хватом', 'Нейтральным хватом', 'Обратным хватом', 'Гравитрон'],
};

/**
 * Pre-defined quick addition templates for extra exercises (abs, calves, hyperextension, etc.)
 */
export interface QuickAddTemplate {
  name: string;
  lift: string;
  kind: 'isolation' | 'compound';
  inc: number;
  muscles: Record<string, number>;
  defaultSets: number;
  defaultReps: number;
}

export const QUICK_ADD_TEMPLATES: QuickAddTemplate[] = [
  {
    name: 'Пресс (скручивания / подъёмы ног)',
    lift: 'abs_crunch',
    kind: 'isolation',
    inc: 2.5,
    muscles: { abs: 1 },
    defaultSets: 3,
    defaultReps: 15,
  },
  {
    name: 'Гиперэкстензия',
    lift: 'hyperext',
    kind: 'isolation',
    inc: 2.5,
    muscles: { hams: 0.5, glutes: 0.5, back: 0.5 },
    defaultSets: 3,
    defaultReps: 12,
  },
  {
    name: 'Подъёмы на икры (стоя / сидя)',
    lift: 'calves_raise',
    kind: 'isolation',
    inc: 2.5,
    muscles: { calves: 1 },
    defaultSets: 4,
    defaultReps: 15,
  },
  {
    name: 'Шраги (гантели / штанга)',
    lift: 'shrugs',
    kind: 'isolation',
    inc: 2.5,
    muscles: { traps: 1 },
    defaultSets: 3,
    defaultReps: 12,
  },
  {
    name: 'Отжимания на брусьях',
    lift: 'dips',
    kind: 'compound',
    inc: 2.5,
    muscles: { chest: 0.5, triceps: 1, fdelts: 0.5 },
    defaultSets: 3,
    defaultReps: 10,
  },
  {
    name: 'Подтягивания (дополнительно)',
    lift: 'pullups_extra',
    kind: 'compound',
    inc: 2.5,
    muscles: { back: 1, biceps: 0.5 },
    defaultSets: 3,
    defaultReps: 8,
  },
];
