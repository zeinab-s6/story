CREATE TABLE IF NOT EXISTS voice_profiles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT,
  parent_label TEXT NOT NULL,
  provider TEXT NOT NULL,
  openai_voice_id TEXT,
  consent_audio_path TEXT,
  sample_audio_path TEXT,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_voice_profiles_session_id ON voice_profiles(session_id);
