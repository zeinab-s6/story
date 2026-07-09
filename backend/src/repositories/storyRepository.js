import db from '../db/database.js';

const insertStoryStmt = db.prepare(`
  INSERT INTO stories (
    session_id, user_id, child_name, age, interest, goal, mood, duration_minutes,
    extra_context, provider, model, prompt_version, story_json,
    safety_status, safety_reason, created_at
  ) VALUES (
    @sessionId, @userId, @childName, @age, @interest, @goal, @mood, @durationMinutes,
    @extraContext, @provider, @model, @promptVersion, @storyJson,
    @safetyStatus, @safetyReason, @createdAt
  )
`);

const getStoryByIdStmt = db.prepare('SELECT * FROM stories WHERE id = ?');
const deleteStoryStmt = db.prepare('DELETE FROM stories WHERE id = ?');
const getStoriesBySessionStmt = db.prepare(`
  SELECT * FROM stories WHERE session_id = ? ORDER BY created_at DESC LIMIT ?
`);
const getStoriesByUserStmt = db.prepare(`
  SELECT * FROM stories WHERE user_id = ? ORDER BY created_at DESC LIMIT ?
`);
const getStoriesByUserWithAudioStmt = db.prepare(`
  SELECT
    s.*,
    sa.id AS audio_id,
    sa.voice AS audio_voice,
    sa.format AS audio_format
  FROM stories s
  LEFT JOIN story_audio sa ON sa.id = (
    SELECT id FROM story_audio WHERE story_id = s.id ORDER BY created_at DESC LIMIT 1
  )
  WHERE s.user_id = ?
  ORDER BY s.created_at DESC
  LIMIT ?
`);

function mapStoryRow(row) {
  if (!row) return null;

  return {
    id: row.id,
    sessionId: row.session_id,
    userId: row.user_id,
    childName: row.child_name,
    age: row.age,
    interest: row.interest,
    goal: row.goal,
    mood: row.mood,
    durationMinutes: row.duration_minutes,
    extraContext: row.extra_context,
    provider: row.provider,
    model: row.model,
    promptVersion: row.prompt_version,
    story: JSON.parse(row.story_json),
    safetyStatus: row.safety_status,
    safetyReason: row.safety_reason,
    createdAt: row.created_at,
  };
}

export function saveStoryRequestAndResult(
  input,
  story,
  provider,
  model,
  promptVersion,
  safetyStatus,
  safetyReason = null,
) {
  const result = insertStoryStmt.run({
    sessionId: input.sessionId ?? null,
    userId: input.userId ?? null,
    childName: input.childName ?? null,
    age: input.age,
    interest: input.interest,
    goal: input.goal,
    mood: input.mood,
    durationMinutes: input.durationMinutes,
    extraContext: input.extraContext ?? null,
    provider,
    model: model ?? null,
    promptVersion,
    storyJson: JSON.stringify(story),
    safetyStatus,
    safetyReason,
    createdAt: new Date().toISOString(),
  });

  return result.lastInsertRowid;
}

export function getStoryById(id) {
  const row = getStoryByIdStmt.get(id);
  return mapStoryRow(row);
}

export function deleteStoryById(id) {
  const run = db.transaction(() => {
    db.prepare('DELETE FROM feedback WHERE story_id = ?').run(id);
    db.prepare('UPDATE usage_logs SET story_id = NULL WHERE story_id = ?').run(id);
    const result = deleteStoryStmt.run(id);
    return result.changes > 0;
  });
  return run();
}

export function getStoriesBySessionId(sessionId, limit = 20) {
  const rows = getStoriesBySessionStmt.all(sessionId, limit);
  return rows.map(mapStoryRow);
}

export function getStoriesByUserId(userId, limit = 20) {
  const rows = getStoriesByUserStmt.all(userId, limit);
  return rows.map(mapStoryRow);
}

function mapStoryRowWithAudio(row) {
  const story = mapStoryRow(row);
  if (!story) return null;

  if (!row.audio_id) {
    return { ...story, latestAudio: null };
  }

  return {
    ...story,
    latestAudio: {
      id: row.audio_id,
      voice: row.audio_voice,
      format: row.audio_format,
      audioUrl: `/api/stories/${story.id}/audio/${row.audio_id}`,
    },
  };
}

export function getStoriesByUserIdWithLatestAudio(userId, limit = 20) {
  const rows = getStoriesByUserWithAudioStmt.all(userId, limit);
  return rows.map(mapStoryRowWithAudio).filter(Boolean);
}

export function getStoryStats() {
  const totalStories = db.prepare('SELECT COUNT(*) AS count FROM stories').get().count;
  const totalFeedback = db.prepare('SELECT COUNT(*) AS count FROM feedback').get().count;
  const totalUsageLogs = db.prepare('SELECT COUNT(*) AS count FROM usage_logs').get().count;

  const storiesByProvider = db
    .prepare('SELECT provider, COUNT(*) AS count FROM stories GROUP BY provider')
    .all();

  const storiesByGoal = db
    .prepare('SELECT goal, COUNT(*) AS count FROM stories GROUP BY goal')
    .all();

  return {
    totalStories,
    totalFeedback,
    totalUsageLogs,
    storiesByProvider,
    storiesByGoal,
  };
}
