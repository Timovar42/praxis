import Dexie, { type Table } from 'dexie';
import type { Program, Session, Settings } from '../domain/types';
import type { AppEvent, Repository } from './repository';
import { seedProgram } from '../data/seedProgram';

const SCHEMA_VERSION = 1;

class WaveLogDB extends Dexie {
  programs!: Table<Program, string>;
  sessions!: Table<Session, string>;
  settings!: Table<Settings & { id: string }, string>;
  events!: Table<AppEvent, number>;

  constructor() {
    super('WaveLogDB');
    this.version(1).stores({
      programs: 'id',
      sessions: 'id, date, day',
      settings: 'id',
      events: '++id, type, createdAt',
    });
  }
}

const db = new WaveLogDB();

export const dexieRepo: Repository = {
  async getProgram() {
    return (await db.programs.get('wavelog-default')) ?? null;
  },
  async saveProgram(p) {
    await db.programs.put(p);
  },
  async getSessions(limit = 500) {
    return db.sessions.orderBy('date').reverse().limit(limit).toArray();
  },
  async getSession(id) {
    return (await db.sessions.get(id)) ?? null;
  },
  async saveSession(s) {
    await db.sessions.put(s);
  },
  async deleteSession(id) {
    await db.sessions.delete(id);
  },
  async getSettings() {
    return (await db.settings.get('default')) ?? null;
  },
  async saveSettings(s) {
    await db.settings.put({ ...s, id: 'default' });
  },
  async appendEvent(e) {
    await db.events.add({ ...e, createdAt: new Date().toISOString() });
  },
  async getEvents(limit = 1000) {
    return db.events.orderBy('id').reverse().limit(limit).toArray();
  },
  async exportJSON() {
    const [program, sessions, settings, events] = await Promise.all([
      db.programs.toArray(),
      db.sessions.toArray(),
      db.settings.toArray(),
      db.events.toArray(),
    ]);
    return JSON.stringify({ schemaVersion: SCHEMA_VERSION, program: program[0], sessions, settings: settings[0], events }, null, 2);
  },
  async importJSON(json) {
    const data = JSON.parse(json);
    // Basic validation
    if (!data.schemaVersion) throw new Error('Invalid export: missing schemaVersion');
    await db.transaction('rw', db.programs, db.sessions, db.settings, db.events, async () => {
      if (data.program) await db.programs.put(data.program);
      if (data.sessions) await db.sessions.bulkPut(data.sessions);
      if (data.settings) await db.settings.put(data.settings);
      if (data.events) await db.events.bulkAdd(data.events.map((e: AppEvent) => ({ ...e, id: undefined })));
    });
  },
};

// Initialize with seed program if empty
export async function initRepo() {
  const existing = await dexieRepo.getProgram();
  if (!existing) {
    await dexieRepo.saveProgram(seedProgram);
  }
  const settings = await dexieRepo.getSettings();
  if (!settings) {
    await dexieRepo.saveSettings({ rpeMode: 'mid', formula: 'epley', units: 'kg' });
  }
}
