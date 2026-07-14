import db from '../db/database.js';
import { getTehranDayBounds } from '../utils/tehranDay.js';

const SUCCESS_STATUS = 'success';

export function countUserSuccessGenerationsToday(userId) {
  const { startIso, endIso } = getTehranDayBounds();
  const row = db.prepare(`
    SELECT COUNT(*) AS count
    FROM story_generations
    WHERE user_id = ?
      AND status = ?
      AND created_at >= ?
      AND created_at < ?
  `).get(userId, SUCCESS_STATUS, startIso, endIso);
  return row?.count ?? 0;
}

export function countDeviceSuccessGenerationsToday({ deviceId, androidIdHash }) {
  const { startIso, endIso } = getTehranDayBounds();

  if (androidIdHash) {
    const row = db.prepare(`
      SELECT COUNT(*) AS count
      FROM story_generations
      WHERE status = ?
        AND created_at >= ?
        AND created_at < ?
        AND android_id_hash = ?
    `).get(SUCCESS_STATUS, startIso, endIso, androidIdHash);
    return row?.count ?? 0;
  }

  const row = db.prepare(`
    SELECT COUNT(*) AS count
    FROM story_generations
    WHERE status = ?
      AND created_at >= ?
      AND created_at < ?
      AND device_id = ?
      AND (android_id_hash IS NULL OR android_id_hash = '')
  `).get(SUCCESS_STATUS, startIso, endIso, deviceId);
  return row?.count ?? 0;
}

const insertGenerationStmt = db.prepare(`
  INSERT INTO story_generations (
    user_id, device_id, android_id_hash, created_at, status, credits_used
  ) VALUES (
    @userId, @deviceId, @androidIdHash, @createdAt, @status, @creditsUsed
  )
`);

export function recordSuccessfulGeneration({
  userId,
  deviceId,
  androidIdHash = null,
  creditsUsed = 1,
}) {
  return insertGenerationStmt.run({
    userId,
    deviceId,
    androidIdHash,
    createdAt: new Date().toISOString(),
    status: SUCCESS_STATUS,
    creditsUsed,
  }).lastInsertRowid;
}

export default {
  countUserSuccessGenerationsToday,
  countDeviceSuccessGenerationsToday,
  recordSuccessfulGeneration,
};
