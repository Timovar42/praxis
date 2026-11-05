import { create } from 'zustand';
import { dexieRepo, initRepo, DEFAULT_USER_ACCOUNT } from '../repo/dexieRepo';
import type { Program, Session, Settings, UserAccount, UserProfile } from '../domain/types';
import { seedProgram } from '../data/seedProgram';
import { DEFAULT_USER_PROFILE } from '../domain/cardio';

const ACTIVE_USER_KEY = 'praxis_active_user_id';

interface AppState {
  currentUser: UserAccount | null;
  users: UserAccount[];
  program: Program | null;
  sessions: Session[];
  settings: Settings | null;
  initialized: boolean;
  onboardingRequired: boolean;

  init(): Promise<void>;
  switchUser(userId: string): Promise<void>;
  loginWithGoogle(account: {
    email: string;
    name?: string;
    picture?: string;
    id?: string;
  }): Promise<void>;
  logout(): Promise<void>;
  completeOnboarding(profile: UserProfile): Promise<void>;
  saveSession(s: Session): Promise<void>;
  deleteSession(id: string): Promise<void>;
  saveProgram(p: Program): Promise<void>;
  saveSettings(s: Settings): Promise<void>;
  refreshSessions(): Promise<void>;
}

export const useAppStore = create<AppState>((set, get) => ({
  currentUser: null,
  users: [],
  program: null,
  sessions: [],
  settings: null,
  initialized: false,
  onboardingRequired: false,

  async init() {
    try {
      await initRepo();
      const allUsers = await dexieRepo.getUsers();
      const storedUserId = localStorage.getItem(ACTIVE_USER_KEY);
      const activeUserId =
        storedUserId && allUsers.some((u) => u.id === storedUserId)
          ? storedUserId
          : 'user_default';

      let activeUser = await dexieRepo.getUser(activeUserId);
      if (!activeUser) {
        activeUser = DEFAULT_USER_ACCOUNT;
        await dexieRepo.saveUser(activeUser);
      }

      localStorage.setItem(ACTIVE_USER_KEY, activeUser.id);

      const [program, sessions, settings] = await Promise.all([
        dexieRepo.getProgram(activeUser.id),
        dexieRepo.getSessions(activeUser.id),
        dexieRepo.getSettings(activeUser.id),
      ]);

      const fallbackProfile: UserProfile = {
        gender: 'male',
        age: 18,
        height: 183,
        weight: 92,
        bodyFatPct: 27,
      };

      set({
        currentUser: activeUser,
        users: allUsers.length > 0 ? allUsers : [activeUser],
        program: program ?? (activeUser.id === 'user_default' ? seedProgram : null),
        sessions: sessions ?? [],
        settings: settings
          ? {
              ...settings,
              profile: settings.profile
                ? { ...fallbackProfile, ...settings.profile }
                : fallbackProfile,
            }
          : { rpeMode: 'mid', formula: 'epley', units: 'kg', profile: fallbackProfile },
        onboardingRequired: !activeUser.onboarded,
        initialized: true,
      });
    } catch (err) {
      console.error('Praxis: Failed to initialize from Dexie, fallback to in-memory:', err);
      set({
        currentUser: DEFAULT_USER_ACCOUNT,
        users: [DEFAULT_USER_ACCOUNT],
        program: seedProgram,
        sessions: [],
        settings: {
          rpeMode: 'mid',
          formula: 'epley',
          units: 'kg',
          profile: DEFAULT_USER_PROFILE,
        },
        onboardingRequired: false,
        initialized: true,
      });
    }
  },

  async switchUser(userId: string) {
    try {
      const user = await dexieRepo.getUser(userId);
      if (!user) return;

      localStorage.setItem(ACTIVE_USER_KEY, userId);

      const [program, sessions, settings, allUsers] = await Promise.all([
        dexieRepo.getProgram(userId),
        dexieRepo.getSessions(userId),
        dexieRepo.getSettings(userId),
        dexieRepo.getUsers(),
      ]);

      set({
        currentUser: user,
        users: allUsers,
        program: program ?? (user.id === 'user_default' ? seedProgram : null),
        sessions: sessions ?? [],
        settings: settings ?? {
          rpeMode: 'mid',
          formula: 'epley',
          units: 'kg',
          profile: DEFAULT_USER_PROFILE,
        },
        onboardingRequired: !user.onboarded,
      });
    } catch (err) {
      console.error('Praxis: Failed to switch user:', err);
    }
  },

  async loginWithGoogle(account) {
    const email = account.email.trim().toLowerCase();
    const id = account.id || `google_${btoa(email).replace(/[^a-zA-Z0-9]/g, '_')}`;

    let user = await dexieRepo.getUser(id);
    let isNew = false;

    if (!user) {
      isNew = true;
      user = {
        id,
        email,
        name: account.name || email.split('@')[0],
        picture: account.picture,
        provider: 'google',
        createdAt: new Date().toISOString(),
        onboarded: false,
      };
      await dexieRepo.saveUser(user);
    }

    localStorage.setItem(ACTIVE_USER_KEY, user.id);

    const [program, sessions, settings, allUsers] = await Promise.all([
      dexieRepo.getProgram(user.id),
      dexieRepo.getSessions(user.id),
      dexieRepo.getSettings(user.id),
      dexieRepo.getUsers(),
    ]);

    set({
      currentUser: user,
      users: allUsers,
      program: program ?? (isNew ? null : seedProgram),
      sessions: sessions ?? [],
      settings: settings ?? {
        rpeMode: 'mid',
        formula: 'epley',
        units: 'kg',
        profile: DEFAULT_USER_PROFILE,
      },
      onboardingRequired: !user.onboarded,
    });
  },

  async completeOnboarding(profile: UserProfile) {
    const { currentUser, settings } = get();
    if (!currentUser) return;

    const updatedUser: UserAccount = {
      ...currentUser,
      onboarded: true,
    };
    await dexieRepo.saveUser(updatedUser);

    // Create a personal isolated clone of the program for this user
    const personalProgram: Program = {
      ...seedProgram,
      id: `program-${currentUser.id}`,
      name: `${currentUser.name} — Силовой цикл`,
    };
    await dexieRepo.saveProgram(personalProgram, currentUser.id);

    const updatedSettings: Settings = {
      ...(settings ?? { rpeMode: 'mid', formula: 'epley', units: 'kg' }),
      profile,
    };
    await dexieRepo.saveSettings(updatedSettings, currentUser.id);

    const allUsers = await dexieRepo.getUsers();

    set({
      currentUser: updatedUser,
      users: allUsers,
      program: personalProgram,
      sessions: [],
      settings: updatedSettings,
      onboardingRequired: false,
    });
  },

  async logout() {
    // Switch back to default user
    await get().switchUser('user_default');
  },

  async saveSession(s) {
    const { currentUser } = get();
    const userId = currentUser?.id ?? 'user_default';
    await dexieRepo.saveSession(s, userId);
    await dexieRepo.appendEvent({ type: 'session_logged', payload: { sessionId: s.id } }, userId);
    const sessions = await dexieRepo.getSessions(userId);
    set({ sessions });
  },

  async deleteSession(id) {
    const { currentUser } = get();
    const userId = currentUser?.id ?? 'user_default';
    await dexieRepo.deleteSession(id, userId);
    const sessions = await dexieRepo.getSessions(userId);
    set({ sessions });
  },

  async saveProgram(p) {
    const { currentUser } = get();
    const userId = currentUser?.id ?? 'user_default';
    await dexieRepo.saveProgram(p, userId);
    await dexieRepo.appendEvent({ type: 'plan_edited', payload: { programId: p.id } }, userId);
    set({ program: p });
  },

  async saveSettings(s) {
    const { currentUser } = get();
    const userId = currentUser?.id ?? 'user_default';
    await dexieRepo.saveSettings(s, userId);
    await dexieRepo.appendEvent({ type: 'settings_changed', payload: s }, userId);
    set({ settings: s });
  },

  async refreshSessions() {
    const { currentUser } = get();
    const userId = currentUser?.id ?? 'user_default';
    const sessions = await dexieRepo.getSessions(userId);
    set({ sessions });
  },
}));
