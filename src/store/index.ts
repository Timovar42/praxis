import { create } from 'zustand';
import { dexieRepo, initRepo } from '../repo/dexieRepo';
import type { Program, Session, Settings } from '../domain/types';
import { seedProgram } from '../data/seedProgram';

interface AppState {
  program: Program | null;
  sessions: Session[];
  settings: Settings | null;
  initialized: boolean;

  init(): Promise<void>;
  saveSession(s: Session): Promise<void>;
  deleteSession(id: string): Promise<void>;
  saveProgram(p: Program): Promise<void>;
  saveSettings(s: Settings): Promise<void>;
  refreshSessions(): Promise<void>;
}

export const useAppStore = create<AppState>((set) => ({
  program: null,
  sessions: [],
  settings: null,
  initialized: false,

  async init() {
    try {
      await initRepo();
      const [program, sessions, settings] = await Promise.all([
        dexieRepo.getProgram(),
        dexieRepo.getSessions(),
        dexieRepo.getSettings(),
      ]);
      const fallbackProfile = { gender: 'male' as const, age: 18, weight: 92, bodyFatPct: 27 };
      set({
        program: program ?? seedProgram,
        sessions: sessions ?? [],
        settings: settings
          ? { ...settings, profile: settings.profile ?? fallbackProfile }
          : { rpeMode: 'mid', formula: 'epley', units: 'kg', profile: fallbackProfile },
        initialized: true,
      });
    } catch (err) {
      console.error('Proxis: Failed to initialize from Dexie, fallback to in-memory:', err);
      set({
        program: seedProgram,
        sessions: [],
        settings: {
          rpeMode: 'mid',
          formula: 'epley',
          units: 'kg',
          profile: { gender: 'male', age: 18, weight: 92, bodyFatPct: 27 },
        },
        initialized: true,
      });
    }
  },

  async saveSession(s) {
    await dexieRepo.saveSession(s);
    await dexieRepo.appendEvent({ type: 'session_logged', payload: { sessionId: s.id } });
    const sessions = await dexieRepo.getSessions();
    set({ sessions });
  },

  async deleteSession(id) {
    await dexieRepo.deleteSession(id);
    const sessions = await dexieRepo.getSessions();
    set({ sessions });
  },

  async saveProgram(p) {
    await dexieRepo.saveProgram(p);
    await dexieRepo.appendEvent({ type: 'plan_edited', payload: { programId: p.id } });
    set({ program: p });
  },

  async saveSettings(s) {
    await dexieRepo.saveSettings(s);
    await dexieRepo.appendEvent({ type: 'settings_changed', payload: s });
    set({ settings: s });
  },

  async refreshSessions() {
    const sessions = await dexieRepo.getSessions();
    set({ sessions });
  },
}));
