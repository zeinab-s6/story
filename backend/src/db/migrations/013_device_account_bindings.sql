CREATE TABLE IF NOT EXISTS device_account_bindings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  android_id_hash TEXT NOT NULL UNIQUE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  device_id TEXT,
  bound_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_device_account_bindings_user_id ON device_account_bindings(user_id);

INSERT OR IGNORE INTO device_account_bindings (android_id_hash, user_id, device_id, bound_at)
SELECT
  ud.android_id_hash,
  ud.user_id,
  ud.device_id,
  MIN(ud.first_seen_at)
FROM user_devices ud
WHERE ud.android_id_hash IS NOT NULL
  AND ud.android_id_hash != ''
GROUP BY ud.android_id_hash;
