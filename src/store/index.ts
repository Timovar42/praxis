import { create } from 'zustand';
import { dexieRepo, initRepo } from '../repo/dexieRepo';
import type { Program, Session, Settings, UserAccount, UserProfile } from '../domain/types';
import { seedProgram } from '../data/seedProgram';
import { DEFAULT_USER_PROFILE } from '../domain/cardio';
import {
  hashPassword,
  generateSalt,
  generateVerificationCode,
  savePendingVerification,
  verifyCode,
  clearPendingVerification,
  getPendingVerification,
} from '../domain/authService';

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
  forceInit(): void;

  // Authentication & Password Recovery
  login(email: string, password: string): Promise<{ success: boolean; error?: string }>;
  registerStep1(name: string, email: string, password: string): Promise<{ success: boolean; error?: string }>;
  registerStep2(email: string, code: string): Promise<{ success: boolean; error?: string }>;
  forgotPasswordStep1(email: string): Promise<{ success: boolean; error?: string }>;
  forgotPasswordStep2(email: string, code: string, newPassword: string): Promise<{ success: boolean; error?: string }>;
  resendCode(email: string, type: 'register' | 'reset'): Promise<{ success: boolean; error?: string }>;

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

let isInitializing = false;

export const useAppStore = create<AppState>((set, get) => ({
  currentUser: null,
  users: [],
  program: null,
  sessions: [],
  settings: null,
  initialized: false,
  onboardingRequired: false,

  forceInit() {
    set({
      currentUser: null,
      users: [],
      program: null,
      sessions: [],
      settings: null,
      onboardingRequired: false,
      initialized: true,
    });
  },

  async init() {
    if (get().initialized) return;
    if (isInitializing) return;
    isInitializing = true;

    const initTask = async () => {
      await initRepo();
      const allUsers = await dexieRepo.getUsers();

      // Check if an authenticated user session is saved in localStorage
      let activeUserId: string | null = null;
      try {
        const storedUserId = localStorage.getItem(ACTIVE_USER_KEY);
        // Only restore session if user exists in db AND is not the unauthenticated legacy user_default
        if (
          storedUserId &&
          storedUserId !== 'user_default' &&
          allUsers.some((u) => u.id === storedUserId)
        ) {
          activeUserId = storedUserId;
        } else {
          // Clear any legacy unauthenticated session so new devices do NOT auto-login as Timovar42
          localStorage.removeItem(ACTIVE_USER_KEY);
        }
      } catch {}

      if (!activeUserId) {
        // No authenticated user on this device -> Show Login / Registration
        set({
          currentUser: null,
          users: allUsers,
          program: null,
          sessions: [],
          settings: null,
          onboardingRequired: false,
          initialized: true,
        });
        return;
      }

      const activeUser = await dexieRepo.getUser(activeUserId);
      if (!activeUser) {
        set({
          currentUser: null,
          users: allUsers,
          program: null,
          sessions: [],
          settings: null,
          onboardingRequired: false,
          initialized: true,
        });
        return;
      }

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
        users: allUsers,
        program: program ?? null,
        sessions: sessions ?? [],
        settings: settings
          ? {
              ...settings,
              engine: settings.engine || 'v2',
              profile: settings.profile
                ? { ...fallbackProfile, ...settings.profile }
                : fallbackProfile,
            }
          : { rpeMode: 'mid', formula: 'epley', units: 'kg', engine: 'v2', profile: fallbackProfile },
        onboardingRequired: !activeUser.onboarded,
        initialized: true,
      });
    };

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Praxis init timeout')), 2500)
    );

    try {
      await Promise.race([initTask(), timeoutPromise]);
    } catch (err) {
      console.warn('Praxis: Dexie init timed out or failed, using safe fallback:', err);
      set({
        currentUser: null,
        users: [],
        program: null,
        sessions: [],
        settings: null,
        onboardingRequired: false,
        initialized: true,
      });
    } finally {
      isInitializing = false;
    }
  },

  async registerStep1(name: string, email: string, password: string) {
    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanName || cleanName.length < 2) {
      return { success: false, error: 'Имя атлета должно содержать не менее 2 символов.' };
    }
    if (!cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      return { success: false, error: 'Введите корректный адрес электронной почты.' };
    }
    if (!password || password.length < 6) {
      return { success: false, error: 'Пароль должен содержать минимум 6 символов.' };
    }

    try {
      const allUsers = await dexieRepo.getUsers();
      const existing = allUsers.find(
        (u) => (u.email || '').trim().toLowerCase() === cleanEmail
      );
      if (existing) {
        return {
          success: false,
          error: 'Пользователь с такой почтой уже зарегистрирован. Войдите или воспользуйтесь восстановлением пароля.',
        };
      }

      const salt = generateSalt();
      const passwordHash = await hashPassword(password, salt);
      const code = generateVerificationCode();

      savePendingVerification({
        email: cleanEmail,
        code,
        type: 'register',
        name: cleanName,
        passwordHash,
        salt,
        expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes
      });

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Ошибка отправки кода подтверждения.' };
    }
  },

  async registerStep2(email: string, code: string) {
    const cleanEmail = email.trim().toLowerCase();
    const check = verifyCode(cleanEmail, code, 'register');
    if (!check.valid || !check.pending) {
      return { success: false, error: check.error || 'Неверный код.' };
    }

    try {
      const userId = `user_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const newUser: UserAccount = {
        id: userId,
        email: cleanEmail,
        name: check.pending.name || cleanEmail.split('@')[0],
        passwordHash: check.pending.passwordHash,
        salt: check.pending.salt,
        provider: 'email',
        createdAt: new Date().toISOString(),
        onboarded: false,
        verified: true,
      };

      await dexieRepo.saveUser(newUser);

      // Clone clean baseline seed program for this user
      const personalProgram: Program = {
        ...seedProgram,
        id: `program-${userId}`,
        name: `${newUser.name} — Силовой цикл`,
      };
      await dexieRepo.saveProgram(personalProgram, userId);

      const defaultSettings: Settings = {
        rpeMode: 'mid',
        formula: 'epley',
        units: 'kg',
        profile: { gender: 'male', age: 18, height: 183, weight: 92, bodyFatPct: 27 },
      };
      await dexieRepo.saveSettings(defaultSettings, userId);

      clearPendingVerification(cleanEmail, 'register');
      try {
        localStorage.setItem(ACTIVE_USER_KEY, userId);
      } catch {}

      const allUsers = await dexieRepo.getUsers();

      set({
        currentUser: newUser,
        users: allUsers,
        program: personalProgram,
        sessions: [],
        settings: defaultSettings,
        onboardingRequired: true,
      });

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Ошибка создания профиля.' };
    }
  },

  async login(email: string, password: string) {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !password) {
      return { success: false, error: 'Заполните email и пароль.' };
    }

    try {
      const allUsers = await dexieRepo.getUsers();
      const user = allUsers.find(
        (u) => (u.email || '').trim().toLowerCase() === cleanEmail
      );

      if (!user) {
        return {
          success: false,
          error: 'Пользователь с такой почтой не найден. Проверьте адрес или зарегистрируйтесь.',
        };
      }

      if (!user.passwordHash || !user.salt) {
        return {
          success: false,
          error:
            'Для этого аккаунта ещё не задан пароль. Нажмите «Забыли пароль?», чтобы установить его через код подтверждения.',
        };
      }

      const testHash = await hashPassword(password, user.salt);
      if (testHash !== user.passwordHash) {
        return { success: false, error: 'Неверный пароль. Повторите попытку.' };
      }

      try {
        localStorage.setItem(ACTIVE_USER_KEY, user.id);
      } catch {}

      const [program, sessions, settings] = await Promise.all([
        dexieRepo.getProgram(user.id),
        dexieRepo.getSessions(user.id),
        dexieRepo.getSettings(user.id),
      ]);

      set({
        currentUser: user,
        users: allUsers,
        program: program ?? (user.id === 'user_default' ? seedProgram : null),
        sessions: sessions ?? [],
        settings: settings
          ? { ...settings, engine: settings.engine || 'v2' }
          : {
              rpeMode: 'mid',
              formula: 'epley',
              units: 'kg',
              engine: 'v2',
              profile: DEFAULT_USER_PROFILE,
            },
        onboardingRequired: !user.onboarded,
      });

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Ошибка авторизации.' };
    }
  },

  async forgotPasswordStep1(email: string) {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      return { success: false, error: 'Введите корректный адрес электронной почты.' };
    }

    try {
      const allUsers = await dexieRepo.getUsers();
      const user = allUsers.find(
        (u) => (u.email || '').trim().toLowerCase() === cleanEmail
      );

      if (!user) {
        return {
          success: false,
          error: 'Пользователь с такой почтой не найден в системе.',
        };
      }

      const code = generateVerificationCode();
      savePendingVerification({
        email: cleanEmail,
        code,
        type: 'reset',
        expiresAt: Date.now() + 10 * 60 * 1000,
      });

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Ошибка отправки кода сброса.' };
    }
  },

  async forgotPasswordStep2(email: string, code: string, newPassword: string) {
    const cleanEmail = email.trim().toLowerCase();
    if (!newPassword || newPassword.length < 6) {
      return { success: false, error: 'Новый пароль должен содержать минимум 6 символов.' };
    }

    const check = verifyCode(cleanEmail, code, 'reset');
    if (!check.valid) {
      return { success: false, error: check.error || 'Неверный код.' };
    }

    try {
      const allUsers = await dexieRepo.getUsers();
      const user = allUsers.find(
        (u) => (u.email || '').trim().toLowerCase() === cleanEmail
      );

      if (!user) {
        return { success: false, error: 'Пользователь не найден.' };
      }

      const newSalt = generateSalt();
      const newHash = await hashPassword(newPassword, newSalt);

      const updatedUser: UserAccount = {
        ...user,
        passwordHash: newHash,
        salt: newSalt,
        verified: true,
      };

      await dexieRepo.saveUser(updatedUser);
      clearPendingVerification(cleanEmail, 'reset');

      try {
        localStorage.setItem(ACTIVE_USER_KEY, updatedUser.id);
      } catch {}

      const [program, sessions, settings] = await Promise.all([
        dexieRepo.getProgram(updatedUser.id),
        dexieRepo.getSessions(updatedUser.id),
        dexieRepo.getSettings(updatedUser.id),
      ]);

      const updatedUsers = await dexieRepo.getUsers();

      set({
        currentUser: updatedUser,
        users: updatedUsers,
        program: program ?? (updatedUser.id === 'user_default' ? seedProgram : null),
        sessions: sessions ?? [],
        settings: settings
          ? { ...settings, engine: settings.engine || 'v2' }
          : {
              rpeMode: 'mid',
              formula: 'epley',
              units: 'kg',
              engine: 'v2',
              profile: DEFAULT_USER_PROFILE,
            },
        onboardingRequired: !updatedUser.onboarded,
      });

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Ошибка обновления пароля.' };
    }
  },

  async resendCode(email: string, type: 'register' | 'reset') {
    const cleanEmail = email.trim().toLowerCase();
    const existing = getPendingVerification(cleanEmail, type);
    const code = generateVerificationCode();

    savePendingVerification({
      email: cleanEmail,
      code,
      type,
      name: existing?.name,
      passwordHash: existing?.passwordHash,
      salt: existing?.salt,
      expiresAt: Date.now() + 10 * 60 * 1000,
    });

    return { success: true };
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
        settings: settings
          ? { ...settings, engine: settings.engine || 'v2' }
          : {
              rpeMode: 'mid',
              formula: 'epley',
              units: 'kg',
              engine: 'v2',
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
        verified: true,
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
    try {
      localStorage.removeItem(ACTIVE_USER_KEY);
    } catch {}

    const allUsers = await dexieRepo.getUsers();

    set({
      currentUser: null,
      users: allUsers,
      program: null,
      sessions: [],
      settings: null,
      onboardingRequired: false,
    });
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
