CREATE TABLE IF NOT EXISTS experiences (
  id TEXT PRIMARY KEY,
  participant_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  title TEXT NOT NULL,
  demo INTEGER NOT NULL DEFAULT 0,
  payload TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS participant_idx ON experiences(participant_id);
CREATE INDEX IF NOT EXISTS created_at_idx ON experiences(created_at);

CREATE TABLE IF NOT EXISTS variants (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  experience_id TEXT NOT NULL REFERENCES experiences(id),
  created_at TEXT NOT NULL,
  payload TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS variant_experience_idx ON variants(experience_id);
