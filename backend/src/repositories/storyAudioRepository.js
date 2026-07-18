import db from '../db/database.js';
import fs from 'fs';

const insertStmt = db.prepare(`
  INSERT INTO story_audio (
    story_id, voice_profile_id, provider, model, voice, format,
    audio_path, status, fallback_used, created_at
  ) VALUES (
    @storyId, @voiceProfileId, @provider, @model, @voice, @format,
    @audioPath, @status, @fallbackUsed, @createdAt
  )
`);

const getByIdStmt = db.prepare('SELECT * FROM story_audio WHERE id = ?');
const getByStoryIdStmt = db.prepare(`
  SELECT * FROM story_audio WHERE story_id = ? ORDER BY created_at DESC
`);
const getByStoryAndIdStmt = db.prepare(`
  SELECT * FROM story_audio WHERE id = ? AND story_id = ?
`);

function mapRow(row) {
  if (!row) return null;

  return {
    id: row.id,
    storyId: row.story_id,
    voiceProfileId: row.voice_profile_id,
    provider: row.provider,
    model: row.model,
    voice: row.voice,
    format: row.format,
    audioPath: row.audio_path,
    status: row.status,
    fallbackUsed: Boolean(row.fallback_used),
    createdAt: row.created_at,
  };
}

export function toPublicStoryAudio(audio, storyId) {
  if (!audio) return null;

  return {
    id: audio.id,
    storyId: audio.storyId,
    provider: audio.provider,
    model: audio.model,
    voice: audio.voice,
    format: audio.format,
    fallbackUsed: audio.fallbackUsed,
    status: audio.status,
    createdAt: audio.createdAt,
    audioUrl: `/api/stories/${storyId}/audio/${audio.id}`,
  };
}

export function saveStoryAudio({
  storyId,
  voiceProfileId = null,
  provider,
  model = null,
  voice = null,
  format,
  audioPath,
  status,
  fallbackUsed = false,
}) {
  const result = insertStmt.run({
    storyId,
    voiceProfileId,
    provider,
    model,
    voice,
    format,
    audioPath,
    status,
    fallbackUsed: fallbackUsed ? 1 : 0,
    createdAt: new Date().toISOString(),
  });

  return getStoryAudioById(result.lastInsertRowid);
}

export function getStoryAudioById(id) {
  const row = getByIdStmt.get(id);
  return mapRow(row);
}

export function getStoryAudioByStoryId(storyId) {
  const rows = getByStoryIdStmt.all(storyId);
  return rows.map(mapRow);
}

export function getStoryAudioByStoryAndId(storyId, audioId) {
  const row = getByStoryAndIdStmt.get(audioId, storyId);
  return mapRow(row);
}

export function deleteStoryAudioByStoryId(storyId) {
  const rows = getByStoryIdStmt.all(storyId);
  for (const row of rows) {
    if (row.audio_path && fs.existsSync(row.audio_path)) {
      try {
        fs.unlinkSync(row.audio_path);
      } catch {
        // ignore missing or locked files
      }
    }
  }
  db.prepare('DELETE FROM story_audio WHERE story_id = ?').run(storyId);
}
