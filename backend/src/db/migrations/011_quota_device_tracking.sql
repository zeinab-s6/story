CREATE TABLE IF NOT EXISTS user_devices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  device_id TEXT NOT NULL,
  android_id_hash TEXT,
  device_name TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  first_seen_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS story_generations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  device_id TEXT NOT NULL,
  android_id_hash TEXT,
  created_at TEXT NOT NULL,
  status TEXT NOT NULL,
  credits_used INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_user_devices_user_id ON user_devices(user_id);
CREATE INDEX IF NOT EXISTS idx_user_devices_device_id ON user_devices(device_id);
CREATE INDEX IF NOT EXISTS idx_user_devices_android_id_hash ON user_devices(android_id_hash);
CREATE INDEX IF NOT EXISTS idx_story_generations_user_created ON story_generations(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_story_generations_device_created ON story_generations(device_id, created_at);
CREATE INDEX IF NOT EXISTS idx_story_generations_android_hash_created ON story_generations(android_id_hash, created_at);
CREATE INDEX IF NOT EXISTS idx_story_generations_status_created ON story_generations(status, created_at);
