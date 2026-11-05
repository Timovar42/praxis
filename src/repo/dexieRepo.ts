import Dexie, { type Table } from 'dexie';
import type { Program, Session, Settings, UserAccount } from '../domain/types';
import type { AppEvent, Repository } from './repository';
import { seedProgram } from '../data/seedProgram';

const SCHEMA_VERSION = 2;

export const DEFAULT_USER_ACCOUNT: UserAccount = {
  id: 'user_default',
  name: 'Timovar42',
  email: 'a77831818@gmail.com',
  provider: 'google',
  createdAt: '2026-11-02T00:00:00.000Z',
  onboarded: true,
};

class WaveLogDB extends Dexie {
  programs!: Table<Program & { userId?: string }, string>;
  sessions!: Table<Session & { userId?: string }, string>;
  settings!: Table<Settings & { id: string; userId?: string }, string>;
  events!: Table<AppEvent & { userId?: string }, number>;
  users!: Table<UserAccount, string>;

  constructor() {
    super('WaveLogDB');
    this.version(1).stores({
      programs: 'id',
      sessions: 'id, date, day',
      settings: 'id',
      events: '++id, type, createdAt',
    });
    this.version(2).stores({
      programs: 'id, userId',
      sessions: 'id, date, day, userId',
      settings: 'id, userId',
      events: '++id, type, createdAt, userId',
      users: 'id, email',
    }).upgrade(async (tx) => {
      await tx.table('programs').toCollection().modify((p) => {
        if (!p.userId) p.userId = 'user_default';
      });
      await tx.table('sessions').toCollection().modify((s) => {
        if (!s.userId) s.userId = 'user_default';
      });
      await tx.table('settings').toCollection().modify((s) => {
        if (!s.userId) s.userId = 'user_default';
      });
    });
  }
}

const db = new WaveLogDB();

export const dexieRepo: Repository = {
  async getProgram(userId = 'user_default') {
    const p = await db.programs.where('userId').equals(userId).first();
    if (p) return p;
    if (userId === 'user_default') {
      return (await db.programs.get('wavelog-default')) ?? null;
    }
    return null;
  },

  async saveProgram(p, userId = 'user_default') {
    const recordId = p.id || `program-${userId}`;
    await db.programs.put({ ...p, id: recordId, userId });
  },

  async getSessions(userId = 'user_default', limit = 500) {
    const list = await db.sessions.where('userId').equals(userId).sortBy('date');
    if (list.length === 0 && userId === 'user_default') {
      const all = await db.sessions.toArray();
      const defaults = all.filter((s) => !s.userId || s.userId === 'user_default');
      defaults.sort((a, b) => b.date.localeCompare(a.date));
      return defaults.slice(0, limit);
    }
    return list.reverse().slice(0, limit);
  },

  async getSession(id) {
    return (await db.sessions.get(id)) ?? null;
  },

  async saveSession(s, userId = 'user_default') {
    await db.sessions.put({ ...s, userId });
  },

  async deleteSession(id) {
    await db.sessions.delete(id);
  },

  async getSettings(userId = 'user_default') {
    const s = await db.settings.where('userId').equals(userId).first();
    if (s) return s;
    if (userId === 'user_default') {
      return (await db.settings.get('default')) ?? null;
    }
    return null;
  },

  async saveSettings(s, userId = 'user_default') {
    const recordId = `settings-${userId}`;
    await db.settings.put({ ...s, id: recordId, userId });
  },

  async appendEvent(e, userId = 'user_default') {
    await db.events.add({ ...e, userId, createdAt: new Date().toISOString() });
  },

  async getEvents(userId = 'user_default', limit = 1000) {
    return db.events
      .where('userId')
      .equals(userId)
      .reverse()
      .limit(limit)
      .toArray();
  },

  async getUsers() {
    return db.users.toArray();
  },

  async getUser(id) {
    return (await db.users.get(id)) ?? null;
  },

  async saveUser(u) {
    await db.users.put(u);
  },

  async deleteUser(id) {
    await db.transaction('rw', db.programs, db.sessions, db.settings, db.events, db.users, async () => {
      await db.programs.where('userId').equals(id).delete();
      await db.sessions.where('userId').equals(id).delete();
      await db.settings.where('userId').equals(id).delete();
      await db.events.where('userId').equals(id).delete();
      await db.users.delete(id);
    });
  },

  async exportJSON(userId = 'user_default') {
    const [programs, sessions, settings, events] = await Promise.all([
      db.programs.where('userId').equals(userId).toArray(),
      db.sessions.where('userId').equals(userId).toArray(),
      db.settings.where('userId').equals(userId).toArray(),
      db.events.where('userId').equals(userId).toArray(),
    ]);
    return JSON.stringify(
      {
        schemaVersion: SCHEMA_VERSION,
        userId,
        program: programs[0] ?? (await db.programs.get('wavelog-default')),
        sessions,
        settings: settings[0] ?? (await db.settings.get('default')),
        events,
      },
      null,
      2
    );
  },

  async importJSON(json, userId = 'user_default') {
    const data = JSON.parse(json);
    if (!data.schemaVersion) throw new Error('Invalid export: missing schemaVersion');
    await db.transaction('rw', db.programs, db.sessions, db.settings, db.events, async () => {
      if (data.program) {
        await db.programs.put({ ...data.program, userId });
      }
      if (data.sessions) {
        await db.sessions.bulkPut(data.sessions.map((s: Session) => ({ ...s, userId })));
      }
      if (data.settings) {
        await db.settings.put({ ...data.settings, id: `settings-${userId}`, userId });
      }
      if (data.events) {
        await db.events.bulkAdd(
          data.events.map((e: AppEvent) => ({ ...e, id: undefined, userId }))
        );
      }
    });
  },
};

// Initialize with default user and seed program if empty
export async function initRepo() {
  // Ensure default user exists
  const existingUser = await dexieRepo.getUser('user_default');
  if (!existingUser) {
    await dexieRepo.saveUser(DEFAULT_USER_ACCOUNT);
  }

  // Ensure default program exists
  const existingProgram = await dexieRepo.getProgram('user_default');
  if (!existingProgram) {
    await dexieRepo.saveProgram(seedProgram, 'user_default');
  }

  // Ensure default settings exist
  const settings = await dexieRepo.getSettings('user_default');
  if (!settings) {
    await dexieRepo.saveSettings(
      {
        rpeMode: 'mid',
        formula: 'epley',
        units: 'kg',
        profile: { gender: 'male', age: 18, height: 183, weight: 92, bodyFatPct: 27 },
      },
      'user_default'
    );
  } else if (!settings.profile) {
    await dexieRepo.saveSettings(
      {
        ...settings,
        profile: { gender: 'male', age: 18, height: 183, weight: 92, bodyFatPct: 27 },
      },
      'user_default'
    );
  }
}
