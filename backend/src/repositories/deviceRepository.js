import db from '../db/database.js';

const findByUserAndDeviceStmt = db.prepare(`
  SELECT * FROM user_devices
  WHERE user_id = ?
    AND device_id = ?
    AND (
      (android_id_hash IS NULL AND ? IS NULL)
      OR android_id_hash = ?
    )
  LIMIT 1
`);

const insertDeviceStmt = db.prepare(`
  INSERT INTO user_devices (
    user_id, device_id, android_id_hash, device_name, is_active, first_seen_at, last_seen_at
  ) VALUES (
    @userId, @deviceId, @androidIdHash, @deviceName, 1, @now, @now
  )
`);

const updateDeviceSeenStmt = db.prepare(`
  UPDATE user_devices
  SET last_seen_at = @now,
      device_name = COALESCE(@deviceName, device_name),
      is_active = 1
  WHERE id = @id
`);

export function upsertUserDevice({
  userId,
  deviceId,
  androidIdHash = null,
  deviceName = null,
}) {
  const now = new Date().toISOString();
  const existing = findByUserAndDeviceStmt.get(
    userId,
    deviceId,
    androidIdHash,
    androidIdHash,
  );

  if (existing) {
    updateDeviceSeenStmt.run({ id: existing.id, now, deviceName });
    return existing.id;
  }

  return insertDeviceStmt.run({
    userId,
    deviceId,
    androidIdHash,
    deviceName,
    now,
  }).lastInsertRowid;
}

export default upsertUserDevice;
