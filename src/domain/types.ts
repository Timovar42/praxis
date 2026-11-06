export type Zone = 'vol' | 'mid' | 'str';
export type DayKey = 'mon' | 'tue' | 'wed' | 'fri' | 'sat';
export type Kind = 'main' | 'compound' | 'isolation' | 'warmup';
export type SetType = 'work' | 'warmup' | 'attack' | 'drop';
export type Muscle = 'quads' | 'hams' | 'glutes' | 'chest' | 'back' | 'traps' | 'fdelts' | 'sdelts' | 'rdelts' | 'biceps' | 'triceps' | 'calves' | 'abs';
export type PeriodizationType = 'wave' | 'linear' | 'block' | 'fixed';

// opts: [[sets, reps], ...], reps can be number or [min, max]
export interface Rx {
  opts: [number, number | [number, number]][];
  rpe?: [number, number];
  cap?: number;
}

export interface Slot {
  id: string;
  lift: string; // shared lift key for e1RM history
  name: string;
  day: DayKey;
  kind: Kind;
  inc: number; // rounding step in kg
  optional?: boolean;
  countsInVolume?: boolean; // default true
  muscles: Partial<Record<Muscle, number>>; // 1 = direct, 0.5 = indirect
  rx: Record<Zone, Rx>;
  variations?: string[]; // available equipment/analog alternatives
}

export interface Program {
  id: string;
  name: string;
  periodization?: PeriodizationType;
  description?: string;
  cycleStart: string; // ISO date of Monday of week 1
  cycleWeeks: number; // 3
  rotation: Record<DayKey, Zone[]>; // zone per cycle week
  days: Record<DayKey, { title: string; cardio?: { minutes: number; kind: string } }>;
  slots: Slot[];
}

export interface SetLog {
  weight?: number;
  reps?: number;
  rpe?: number;
  type: SetType;
  done: boolean;
}

export interface ExerciseLog {
  slotId: string;
  zone: Zone;
  variant: number; // index into rx.opts
  rxSnapshot: Rx;
  sets: SetLog[];
  rpe?: number; // exercise-level RPE override
  note?: string;
  skipped?: boolean;
  variation?: string; // selected analog (e.g. "в гакке", "со штангой")
  customName?: string; // custom exercise name if added ad-hoc
}

export interface CardioSession {
  kind: string; // e.g. 'treadmill_walk', 'treadmill_run', etc.
  minutes: number;
  calories?: number;
  done: boolean;
}

export interface Session {
  id: string;
  date: string; // YYYY-MM-DD
  day: DayKey;
  cycle: number;
  week: number; // 1-based
  entries: ExerciseLog[];
  cardioDone?: boolean;
  cardio?: CardioSession;
  badDay?: boolean;
  note?: string;
}

export interface UserProfile {
  gender: 'male' | 'female';
  age: number; // default: 18
  height: number; // default: 183 (cm)
  weight: number; // default: 92 (kg)
  bodyFatPct: number; // default: 27 (%)
}

export interface UserAccount {
  id: string; // unique ID e.g. "user_..." or google sub
  email: string;
  name: string;
  passwordHash?: string; // SHA-256 hash
  salt?: string;
  picture?: string;
  provider: 'email' | 'google' | 'local';
  createdAt: string;
  onboarded: boolean;
  verified?: boolean;
}

export interface Settings {
  rpeMode: 'low' | 'mid' | 'high';
  formula: 'epley' | 'brzycki';
  units: 'kg';
  profile?: UserProfile;
  googleClientId?: string;
}

export interface Suggestion {
  weight: number;
  reps: number | [number, number];
  sets: number;
  explanation: string;
  cappedDown?: boolean;
  check?: boolean;
}

export interface E1RMResult {
  value: number;
  check?: boolean; // true if capped at +5%
}
