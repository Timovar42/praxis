import type { Program, Session, Settings } from '../domain/types';

export interface AppEvent {
  id?: number;
  type: 'session_logged' | 'plan_edited' | 'settings_changed';
  payload: unknown;
  createdAt: string;
}

export interface Repository {
  // Program
  getProgram(): Promise<Program | null>;
  saveProgram(p: Program): Promise<void>;

  // Sessions
  getSessions(limit?: number): Promise<Session[]>;
  getSession(id: string): Promise<Session | null>;
  saveSession(s: Session): Promise<void>;
  deleteSession(id: string): Promise<void>;

  // Settings
  getSettings(): Promise<Settings | null>;
  saveSettings(s: Settings): Promise<void>;

  // Events
  appendEvent(e: Omit<AppEvent, 'id' | 'createdAt'>): Promise<void>;
  getEvents(limit?: number): Promise<AppEvent[]>;

  // Export/Import
  exportJSON(): Promise<string>;
  importJSON(json: string): Promise<void>;
}
