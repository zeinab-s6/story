import db from '../db/database.js';

const insertUsageLogStmt = db.prepare(`
  INSERT INTO usage_logs (
    story_id, provider, model, latency_ms, status, error_message, created_at
  ) VALUES (
    @storyId, @provider, @model, @latencyMs, @status, @errorMessage, @createdAt
  )
`);

export function saveUsageLog({ storyId, provider, model, latencyMs, status, errorMessage }) {
  const result = insertUsageLogStmt.run({
    storyId: storyId ?? null,
    provider,
    model: model ?? null,
    latencyMs: latencyMs ?? null,
    status,
    errorMessage: errorMessage ?? null,
    createdAt: new Date().toISOString(),
  });

  return result.lastInsertRowid;
}

export default saveUsageLog;
