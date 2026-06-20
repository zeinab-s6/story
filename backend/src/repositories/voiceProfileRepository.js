import db from '../db/database.js';

const insertStmt = db.prepare(`
  INSERT INTO voice_profiles (
    session_id, parent_label, provider, openai_voice_id,
    consent_audio_path, sample_audio_path, status, created_at, updated_at
  ) VALUES (
    @sessionId, @parentLabel, @provider, @openaiVoiceId,
    @consentAudioPath, @sampleAudioPath, @status, @createdAt, @updatedAt
  )
`);

const getByIdStmt = db.prepare('SELECT * FROM voice_profiles WHERE id = ? AND status != ?');
const getBySessionStmt = db.prepare(`
  SELECT * FROM voice_profiles
  WHERE session_id = ? AND status != ?
  ORDER BY created_at DESC
`);
const updateStatusStmt = db.prepare(`
  UPDATE voice_profiles
  SET status = @status, openai_voice_id = @openaiVoiceId, updated_at = @updatedAt
  WHERE id = @id
`);
const markDeletedStmt = db.prepare(`
  UPDATE voice_profiles
  SET status = @status, updated_at = @updatedAt
  WHERE id = @id
`);

function mapRow(row) {
  if (!row) return null;

  return {
    id: row.id,
    sessionId: row.session_id,
    parentLabel: row.parent_label,
    provider: row.provider,
    openaiVoiceId: row.openai_voice_id,
    consentAudioPath: row.consent_audio_path,
    sampleAudioPath: row.sample_audio_path,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function toPublicVoiceProfile(profile) {
  if (!profile) return null;

  return {
    id: profile.id,
    sessionId: profile.sessionId,
    parentLabel: profile.parentLabel,
    provider: profile.provider,
    status: profile.status,
    hasOpenaiVoiceId: Boolean(profile.openaiVoiceId),
  };
}

export function createVoiceProfile({
  sessionId,
  parentLabel,
  provider,
  openaiVoiceId = null,
  consentAudioPath = null,
  sampleAudioPath = null,
  status,
}) {
  const now = new Date().toISOString();
  const result = insertStmt.run({
    sessionId: sessionId ?? null,
    parentLabel,
    provider,
    openaiVoiceId,
    consentAudioPath,
    sampleAudioPath,
    status,
    createdAt: now,
    updatedAt: now,
  });

  return getVoiceProfileById(result.lastInsertRowid);
}

export function getVoiceProfileById(id) {
  const row = getByIdStmt.get(id, 'deleted');
  return mapRow(row);
}

export function getVoiceProfilesBySessionId(sessionId) {
  const rows = getBySessionStmt.all(sessionId, 'deleted');
  return rows.map(mapRow);
}

export function updateVoiceProfileStatus(id, status, openaiVoiceId = null) {
  const now = new Date().toISOString();
  updateStatusStmt.run({
    id,
    status,
    openaiVoiceId,
    updatedAt: now,
  });
  return getVoiceProfileById(id);
}

export function deleteVoiceProfile(id) {
  const profile = getVoiceProfileById(id);
  if (!profile) return null;

  const now = new Date().toISOString();
  markDeletedStmt.run({ id, status: 'deleted', updatedAt: now });
  return profile;
}
