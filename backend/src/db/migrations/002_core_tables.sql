CREATE TABLE IF NOT EXISTS stories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT,
  child_name TEXT,
  age INTEGER NOT NULL,
  interest TEXT NOT NULL,
  goal TEXT NOT NULL,
  mood TEXT NOT NULL,
  duration_minutes INTEGER NOT NULL,
  extra_context TEXT,
  provider TEXT NOT NULL,
  model TEXT,
  prompt_version TEXT NOT NULL DEFAULT 'v1.0.0',
  story_json TEXT NOT NULL,
  safety_status TEXT NOT NULL,
  safety_reason TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS feedback (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  story_id INTEGER NOT NULL,
  rating INTEGER,
  note TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (story_id) REFERENCES stories(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS usage_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  story_id INTEGER,
  provider TEXT NOT NULL,
  model TEXT,
  latency_ms INTEGER,
  status TEXT NOT NULL,
  error_message TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (story_id) REFERENCES stories(id) ON DELETE SET NULL
);
