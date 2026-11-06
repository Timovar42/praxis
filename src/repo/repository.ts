import type { Program, Session, Settings, UserAccount } from '../domain/types';

export interface AppEvent {
  id?: number;
  type: 'session_logged' | 'plan_edited' | 'settings_changed';
  payload: unknown;
  createdAt: string;
}

export interface Repository {
  // Program
  getProgram(userId?: string): Promise<Program | null>;
  saveProgram(p: Program, userId?: string): Promise<void>;

  // Sessions
  getSessions(userId?: string, limit?: number): Promise<Session[]>;
  getSession(id: string, userId?: string): Promise<Session | null>;
  saveSession(s: Session, userId?: string): Promise<void>;
  deleteSession(id: string, userId?: string): Promise<void>;

  // Settings
  getSettings(userId?: string): Promise<Settings | null>;
  saveSettings(s: Settings, userId?: string): Promise<void>;

  // Events
  appendEvent(e: Omit<AppEvent, 'id' | 'createdAt'>, userId?: string): Promise<void>;
  getEvents(userId?: string, limit?: number): Promise<AppEvent[]>;

  // Users
  getUsers(): Promise<UserAccount[]>;
  getUser(id: string): Promise<UserAccount | null>;
  getUserByEmail?(email: string): Promise<UserAccount | null>;
  saveUser(u: UserAccount): Promise<void>;
  deleteUser(id: string): Promise<void>;

  // Export/Import
  exportJSON(userId?: string): Promise<string>;
  importJSON(json: string, userId?: string): Promise<void>;
}
