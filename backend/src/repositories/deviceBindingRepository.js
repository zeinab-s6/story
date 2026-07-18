import db from '../db/database.js';

const getByAndroidHashStmt = db.prepare(`
  SELECT * FROM device_account_bindings
  WHERE android_id_hash = ?
  LIMIT 1
`);

const insertBindingStmt = db.prepare(`
  INSERT INTO device_account_bindings (
    android_id_hash, user_id, device_id, bound_at
  ) VALUES (
    @androidIdHash, @userId, @deviceId, @boundAt
  )
`);

export function getDeviceBindingByAndroidHash(androidIdHash) {
  if (!androidIdHash) return null;
  const row = getByAndroidHashStmt.get(androidIdHash);
  if (!row) return null;
  return {
    id: row.id,
    androidIdHash: row.android_id_hash,
    userId: row.user_id,
    deviceId: row.device_id,
    boundAt: row.bound_at,
  };
}

export function bindDeviceAccount({ androidIdHash, userId, deviceId = null }) {
  if (!androidIdHash || userId == null) return null;

  const existing = getDeviceBindingByAndroidHash(androidIdHash);
  if (existing) {
    return existing;
  }

  const boundAt = new Date().toISOString();
  const result = insertBindingStmt.run({
    androidIdHash,
    userId,
    deviceId,
    boundAt,
  });

  return {
    id: result.lastInsertRowid,
    androidIdHash,
    userId,
    deviceId,
    boundAt,
  };
}

export default {
  getDeviceBindingByAndroidHash,
  bindDeviceAccount,
};
