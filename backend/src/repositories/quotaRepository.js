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
    user_id, device_id, android_id_hash, story_id, created_at, status, credits_used
  ) VALUES (
    @userId, @deviceId, @androidIdHash, @storyId, @createdAt, @status, @creditsUsed
  )
`);

const revertGenerationByStoryIdStmt = db.prepare(`
  DELETE FROM story_generations
  WHERE story_id = ? AND user_id = ? AND status = ?
`);

export function recordSuccessfulGeneration({
  userId,
  deviceId,
  androidIdHash = null,
  storyId = null,
  creditsUsed = 1,
}) {
  return insertGenerationStmt.run({
    userId,
    deviceId,
    androidIdHash,
    storyId,
    createdAt: new Date().toISOString(),
    status: SUCCESS_STATUS,
    creditsUsed,
  }).lastInsertRowid;
}

export function revertStoryGenerationByStoryId(storyId, userId) {
  const result = revertGenerationByStoryIdStmt.run(storyId, userId, SUCCESS_STATUS);
  return result.changes > 0;
}

export default {
  countUserSuccessGenerationsToday,
  countDeviceSuccessGenerationsToday,
  recordSuccessfulGeneration,
  revertStoryGenerationByStoryId,
};
