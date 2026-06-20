CREATE TABLE IF NOT EXISTS story_audio (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  story_id INTEGER NOT NULL,
  voice_profile_id INTEGER,
  provider TEXT NOT NULL,
  model TEXT,
  voice TEXT,
  format TEXT NOT NULL,
  audio_path TEXT NOT NULL,
  status TEXT NOT NULL,
  fallback_used INTEGER DEFAULT 0,
  created_at TEXT NOT NULL,
  FOREIGN KEY (story_id) REFERENCES stories(id) ON DELETE CASCADE,
  FOREIGN KEY (voice_profile_id) REFERENCES voice_profiles(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_story_audio_story_id ON story_audio(story_id);
CREATE INDEX IF NOT EXISTS idx_story_audio_voice_profile_id ON story_audio(voice_profile_id);
CREATE INDEX IF NOT EXISTS idx_story_audio_created_at ON story_audio(created_at);
