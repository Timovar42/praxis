export type Implement =
  | 'barbell'
  | 'ezbar'
  | 'trapbar'
  | 'dumbbell'
  | 'smith'
  | 'machine'
  | 'cable'
  | 'bodyweight';

export type LoadScheme =
  | { type: 'plates'; bar: number; minStep: number } // штанга: гриф + пары блинов, minStep общий шаг (по умолчанию 2.5)
  | { type: 'list'; values: number[] } // гантели: доступные веса на руку
  | { type: 'stack'; step: number; micro?: number[] }; // тренажёры и блоки: шаг стека

export interface Variant {
  id: string;
  implement: Implement;
  label: string;
  perHand?: boolean;
  loadScheme: LoadScheme;
}

export interface KPrior {
  value: number;
  conf: 'high' | 'med' | 'low';
  n: number;
}

export interface Family {
  id: string;
  name: string;
  canonical: string; // у канонического варианта k = 1
  k: Record<string, KPrior>;
}

export type Bin = 'all' | 'low' | 'mid' | 'high';

export interface Estimate {
  id?: string;
  familyId: string;
  bin: Bin;
  mu: number;
  p: number;
  n: number;
  updatedAt: string;
  hist: { date: string; mu: number; sd: number }[];
  userId?: string;
  bias?: number;
}

export type Trend = 'растёт' | 'держится' | 'падает';
