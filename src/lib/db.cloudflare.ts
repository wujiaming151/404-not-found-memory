import { env } from 'cloudflare:workers';
import { normalizeExperience } from './localization';
import type { Fragrance } from './fragrance';
import type { Experience } from './types';

type D1Statement = {
  bind(...values: unknown[]): D1Statement;
  first<T>(): Promise<T | null>;
  all<T>(): Promise<{ results: T[] }>;
  run(): Promise<unknown>;
};

type D1Binding = {
  prepare(query: string): D1Statement;
};

type ImageStore = {
  put(key: string, value: ArrayBuffer): Promise<void>;
  get(
    key: string,
    options: { type: 'arrayBuffer' },
  ): Promise<ArrayBuffer | null>;
  delete(key: string): Promise<void>;
};

type Bindings = {
  DB: D1Binding;
  MEMORY_IMAGES: ImageStore;
};

function bindings() {
  return env as unknown as Bindings;
}

export async function getExperience(id: string): Promise<Experience | null> {
  const row = await bindings()
    .DB.prepare('SELECT payload FROM experiences WHERE id=?')
    .bind(id)
    .first<{ payload: string }>();
  if (!row) return null;
  const experience = JSON.parse(row.payload) as Experience;
  experience.variants = await listVariants(id);
  return normalizeExperience(experience);
}

export async function createExperience(
  experience: Experience,
  image: Uint8Array,
) {
  const key = `experience:${experience.id}`;
  await bindings()
    .DB.prepare(
      'INSERT INTO experiences(id,participant_id,created_at,title,demo,payload) VALUES(?,?,?,?,?,?)',
    )
    .bind(
      experience.id,
      experience.participantId,
      experience.createdAt,
      experience.title,
      Number(experience.demo),
      JSON.stringify(experience),
    )
    .run();
  try {
    const bytes = image.buffer.slice(
      image.byteOffset,
      image.byteOffset + image.byteLength,
    ) as ArrayBuffer;
    await bindings().MEMORY_IMAGES.put(key, bytes);
  } catch (error) {
    await bindings()
      .DB.prepare('DELETE FROM experiences WHERE id=?')
      .bind(experience.id)
      .run();
    throw error;
  }
}

export async function getExperienceImage(id: string) {
  const image = await bindings().MEMORY_IMAGES.get(`experience:${id}`, {
    type: 'arrayBuffer',
  });
  return image ? new Uint8Array(image) : null;
}

export async function addVariant(experienceId: string, fragrance: Fragrance) {
  await bindings()
    .DB.prepare(
      'INSERT INTO variants(experience_id,created_at,payload) VALUES(?,?,?)',
    )
    .bind(experienceId, new Date().toISOString(), JSON.stringify(fragrance))
    .run();
}

export async function listVariants(experienceId: string) {
  const result = await bindings()
    .DB.prepare(
      'SELECT payload FROM variants WHERE experience_id=? ORDER BY id',
    )
    .bind(experienceId)
    .all<{ payload: string }>();
  return result.results.map((row) => JSON.parse(row.payload) as Fragrance);
}

export async function listExperiences(filters: {
  query: string;
  from: string;
  to: string;
  includeDemo: boolean;
}) {
  const result = await bindings()
    .DB.prepare(
      'SELECT payload FROM experiences WHERE participant_id LIKE ? AND created_at>=? AND created_at<=? AND (?=1 OR demo=0) ORDER BY created_at DESC',
    )
    .bind(
      `%${filters.query.slice(0, 40)}%`,
      filters.from,
      filters.to,
      Number(filters.includeDemo),
    )
    .all<{ payload: string }>();
  return result.results.map((row) => JSON.parse(row.payload) as Experience);
}
