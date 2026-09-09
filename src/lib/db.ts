import { normalizeExperience } from './localization';
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import type { Experience } from './types';
let connection: DatabaseSync;
export function db() {
  if (!connection) {
    mkdirSync(join(process.cwd(), 'data'), { recursive: true });
    connection = new DatabaseSync(join(process.cwd(), 'data', 'memory.sqlite'));
    connection.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;
CREATE TABLE IF NOT EXISTS experiences(id TEXT PRIMARY KEY, participant_id TEXT NOT NULL, created_at TEXT NOT NULL, title TEXT NOT NULL, demo INTEGER NOT NULL DEFAULT 0, image BLOB NOT NULL, payload TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS participant_idx ON experiences(participant_id);
CREATE TABLE IF NOT EXISTS variants(id INTEGER PRIMARY KEY AUTOINCREMENT, experience_id TEXT NOT NULL REFERENCES experiences(id), created_at TEXT NOT NULL, payload TEXT NOT NULL);
`);
  }
  return connection;
}
export function getExperience(id: string): Experience | null {
  const row = db()
    .prepare('SELECT payload FROM experiences WHERE id=?')
    .get(id) as { payload: string } | undefined;
  if (!row) return null;
  const e = JSON.parse(row.payload) as Experience;
  const variants = db()
    .prepare('SELECT payload FROM variants WHERE experience_id=? ORDER BY id')
    .all(id) as { payload: string }[];
  e.variants = variants.map((v) => JSON.parse(v.payload));
  return normalizeExperience(e);
}
