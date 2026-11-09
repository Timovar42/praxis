import Dexie, { type Table } from 'dexie';
import type { Program, Session, Settings, UserAccount, Estimate, Family } from '../domain/types';
import type { AppEvent, Repository } from './repository';
import { seedProgram } from '../data/seedProgram';
import { DEFAULT_DUMBBELL_VALUES, DEFAULT_FAMILIES } from '../domain/engine2/families';
import { rebuildEstimates } from '../domain/engine2/estimate';
import { migrateProgramV1toV2, migrateSessionsV1toV2 } from '../domain/engine2/migration';

const SCHEMA_VERSION = 2;

export const DEFAULT_USER_ACCOUNT: UserAccount = {
  id: 'user_default',
  name: 'Атлет',
  email: '',
  provider: 'local',
  createdAt: '2026-11-02T00:00:00.000Z',
  onboarded: false,
};

class PraxisDB extends Dexie {
  programs!: Table<Program & { userId?: string }, string>;
  sessions!: Table<Session & { userId?: string }, string>;
  settings!: Table<Settings & { id: string; userId?: string }, string>;
  events!: Table<AppEvent & { userId?: string }, number>;
  users!: Table<UserAccount, string>;
  families!: Table<Family & { userId?: string }, string>;
  estimates!: Table<Estimate & { userId?: string }, string>;

  constructor() {
    super('PraxisDB');
    this.version(1).stores({
      programs: 'id, userId',
      sessions: 'id, date, day, userId',
      settings: 'id, userId',
      events: '++id, type, createdAt, userId',
      users: 'id, email',
    });

    this.version(2)
      .stores({
        programs: 'id, userId',
        sessions: 'id, date, day, userId',
        settings: 'id, userId',
        events: '++id, type, createdAt, userId',
        users: 'id, email',
        families: 'id, userId',
        estimates: 'id, familyId, bin, userId',
      })
      .upgrade(async (tx) => {
        try {
          const programsTable = tx.table('programs');
          const sessionsTable = tx.table('sessions');
          const estimatesTable = tx.table('estimates');

          const allPrograms = await programsTable.toArray();
          for (const p of allPrograms) {
            const migrated = migrateProgramV1toV2(p);
            await programsTable.put(migrated);
          }

          const allSessions = await sessionsTable.toArray();
          const migratedSessions = migrateSessionsV1toV2(allSessions, allPrograms[0]);
          for (const s of migratedSessions) {
            await sessionsTable.put(s);
          }

          // Rebuild estimates cache
          const rebuilt = rebuildEstimates(migratedSessions, DEFAULT_FAMILIES);
          for (const [fId, bins] of Object.entries(rebuilt)) {
            for (const [bKey, est] of Object.entries(bins)) {
              if (est.n > 0) {
                await estimatesTable.put({
                  ...est,
                  id: `${est.userId || 'user_default'}_${fId}_${bKey}`,
                  userId: est.userId || 'user_default',
                });
              }
            }
          }
        } catch (err) {
          console.warn('PraxisDB v2 migration notice:', err);
        }
      });
  }
}

const db = new PraxisDB();

// Handle versionchange event so other tabs/workers do not block database upgrades
if (typeof window !== 'undefined') {
  db.on('versionchange', () => {
    try {
      db.close();
    } catch {}
  });
}

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
    try {
      const allSessions = await db.sessions.where('userId').equals(userId).toArray();
      const settings = (await db.settings.where('userId').equals(userId).first()) || {};
      const rebuilt = rebuildEstimates(allSessions, DEFAULT_FAMILIES, settings);
      const records: (Estimate & { id: string; userId: string })[] = [];
      for (const [fId, bins] of Object.entries(rebuilt)) {
        for (const [bKey, est] of Object.entries(bins)) {
          if (est.n > 0) {
            records.push({
              ...est,
              id: `${userId}_${fId}_${bKey}`,
              userId,
            });
          }
        }
      }
      if (records.length > 0) {
        await db.estimates.bulkPut(records);
      }
    } catch (err) {
      console.warn('Estimates cache update notice:', err);
    }
  },

  async deleteSession(id, userId = 'user_default') {
    await db.sessions.delete(id);
    try {
      const allSessions = await db.sessions.where('userId').equals(userId).toArray();
      const settings = (await db.settings.where('userId').equals(userId).first()) || {};
      const rebuilt = rebuildEstimates(allSessions, DEFAULT_FAMILIES, settings);
      await db.estimates.where('userId').equals(userId).delete();
      const records: (Estimate & { id: string; userId: string })[] = [];
      for (const [fId, bins] of Object.entries(rebuilt)) {
        for (const [bKey, est] of Object.entries(bins)) {
          if (est.n > 0) {
            records.push({
              ...est,
              id: `${userId}_${fId}_${bKey}`,
              userId,
            });
          }
        }
      }
      if (records.length > 0) {
        await db.estimates.bulkPut(records);
      }
    } catch (err) {
      console.warn('Estimates cache update notice:', err);
    }
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

  async getUserByEmail(email: string) {
    const norm = email.trim().toLowerCase();
    const all = await db.users.toArray();
    return all.find((u) => (u.email || '').trim().toLowerCase() === norm) ?? null;
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

  async getFamilies(userId = 'user_default') {
    const list = await db.families.where('userId').equals(userId).toArray();
    if (list.length > 0) return list;
    return Object.values(DEFAULT_FAMILIES);
  },

  async saveFamily(f: Family, userId = 'user_default') {
    await db.families.put({ ...f, userId });
  },

  async getEstimates(userId = 'user_default') {
    return db.estimates.where('userId').equals(userId).toArray();
  },

  async saveEstimates(estimates: Estimate[], userId = 'user_default') {
    const records = estimates.map((e) => ({
      ...e,
      id: e.id || `${userId}_${e.familyId}_${e.bin}`,
      userId,
    }));
    await db.estimates.bulkPut(records);
  },

  async exportJSON(userId = 'user_default') {
    const [programs, sessions, settings, events, estimates] = await Promise.all([
      db.programs.where('userId').equals(userId).toArray(),
      db.sessions.where('userId').equals(userId).toArray(),
      db.settings.where('userId').equals(userId).toArray(),
      db.events.where('userId').equals(userId).toArray(),
      db.estimates.where('userId').equals(userId).toArray(),
    ]);
    return JSON.stringify(
      {
        schemaVersion: SCHEMA_VERSION,
        userId,
        program: programs[0] ?? (await db.programs.get('wavelog-default')),
        sessions,
        settings: settings[0] ?? (await db.settings.get('default')),
        events,
        estimates,
      },
      null,
      2
    );
  },

  async importJSON(json, userId = 'user_default') {
    const data = JSON.parse(json);
    if (!data.schemaVersion) throw new Error('Invalid export: missing schemaVersion');
    await db.transaction('rw', db.programs, db.sessions, db.settings, db.events, db.estimates, async () => {
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
      // Rebuild estimates cache from imported sessions
      if (data.sessions && data.sessions.length > 0) {
        const rebuilt = rebuildEstimates(data.sessions, DEFAULT_FAMILIES, data.settings || {});
        for (const [fId, bins] of Object.entries(rebuilt)) {
          for (const [bKey, est] of Object.entries(bins)) {
            if (est.n > 0) {
              await db.estimates.put({
                ...est,
                id: `${userId}_${fId}_${bKey}`,
                userId,
              });
            }
          }
        }
      }
    });
  },
};

// Initialize with default user and seed program if empty
export async function initRepo() {
  // 1. Ensure db is opened with strict timeout
  await Promise.race([
    db.open(),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('IndexedDB PraxisDB open timeout')), 2500)
    ),
  ]);

  // 2. Safe non-blocking migration from legacy WaveLogDB if present and PraxisDB is empty
  try {
    const sessionCount = await db.sessions.count();
    if (sessionCount === 0) {
      const legacyDb = new Dexie('WaveLogDB');
      legacyDb.version(1).stores({
        programs: 'id',
        sessions: 'id, date, day',
        settings: 'id',
        events: '++id, type, createdAt',
      });
      const legacySessions = await Promise.race([
        legacyDb.table('sessions').toArray(),
        new Promise<any[]>((resolve) => setTimeout(() => resolve([]), 800)),
      ]);
      if (Array.isArray(legacySessions) && legacySessions.length > 0) {
        for (const s of legacySessions) {
          await db.sessions.put({ ...s, userId: s.userId || 'user_default' });
        }
      }
      legacyDb.close();
    }
  } catch {
    // Non-fatal fallback
  }

  // 3. Ensure baseline default program exists for cloning
  const existingProgram = await dexieRepo.getProgram('user_default');
  if (!existingProgram) {
    const v2Seed = migrateProgramV1toV2(seedProgram);
    await dexieRepo.saveProgram(v2Seed, 'user_default');
  }

  // 5. Ensure default settings exist with engine v2 defaults
  const settings = await dexieRepo.getSettings('user_default');
  if (!settings) {
    await dexieRepo.saveSettings(
      {
        rpeMode: 'mid',
        formula: 'epley',
        units: 'kg',
        engine: 'v2',
        phase: 'cut',
        mode: 'normal',
        barWeight: 20,
        minStep: 2.5,
        dumbbellList: DEFAULT_DUMBBELL_VALUES,
        warmups: true,
        profile: { gender: 'male', age: 18, height: 183, weight: 92, bodyFatPct: 27 },
      },
      'user_default'
    );
  } else {
    // Fill in any missing engine v2 settings fields
    const updated: Settings = {
      ...settings,
      engine: settings.engine || 'v2',
      phase: settings.phase || 'cut',
      mode: settings.mode || 'normal',
      barWeight: settings.barWeight ?? 20,
      minStep: settings.minStep ?? 2.5,
      dumbbellList: settings.dumbbellList || DEFAULT_DUMBBELL_VALUES,
      warmups: settings.warmups ?? true,
      profile: settings.profile || { gender: 'male', age: 18, height: 183, weight: 92, bodyFatPct: 27 },
    };
    await dexieRepo.saveSettings(updated, 'user_default');
  }
}
