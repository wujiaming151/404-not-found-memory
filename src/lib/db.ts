import { normalizeExperience } from './localization';
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import type { Fragrance } from './fragrance';
import type { Experience } from './types';

let connection: DatabaseSync;

function db() {
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

export async function getExperience(id: string): Promise<Experience | null> {
  const row = db()
    .prepare('SELECT payload FROM experiences WHERE id=?')
    .get(id) as { payload: string } | undefined;
  if (!row) return null;
  const experience = JSON.parse(row.payload) as Experience;
  experience.variants = await listVariants(id);
  return normalizeExperience(experience);
}

export async function createExperience(
  experience: Experience,
  image: Uint8Array,
) {
  db()
    .prepare(
      'INSERT INTO experiences(id,participant_id,created_at,title,demo,image,payload) VALUES(?,?,?,?,?,?,?)',
    )
    .run(
      experience.id,
      experience.participantId,
      experience.createdAt,
      experience.title,
      Number(experience.demo),
      image,
      JSON.stringify(experience),
    );
}

export async function getExperienceImage(id: string) {
  const row = db()
    .prepare('SELECT image FROM experiences WHERE id=?')
    .get(id) as { image: Uint8Array } | undefined;
  return row ? new Uint8Array(row.image) : null;
}

export async function addVariant(experienceId: string, fragrance: Fragrance) {
  db()
    .prepare(
      'INSERT INTO variants(experience_id,created_at,payload) VALUES(?,?,?)',
    )
    .run(experienceId, new Date().toISOString(), JSON.stringify(fragrance));
}

export async function listVariants(experienceId: string) {
  const rows = db()
    .prepare('SELECT payload FROM variants WHERE experience_id=? ORDER BY id')
    .all(experienceId) as { payload: string }[];
  return rows.map((row) => JSON.parse(row.payload) as Fragrance);
}

export async function listExperiences(filters: {
  query: string;
  from: string;
  to: string;
  includeDemo: boolean;
}) {
  const rows = db()
    .prepare(
      'SELECT payload FROM experiences WHERE participant_id LIKE ? AND created_at>=? AND created_at<=? AND (?=1 OR demo=0) ORDER BY created_at DESC',
    )
    .all(
      `%${filters.query}%`,
      filters.from,
      filters.to,
      Number(filters.includeDemo),
    ) as { payload: string }[];
  return rows.map((row) => JSON.parse(row.payload) as Experience);
}
