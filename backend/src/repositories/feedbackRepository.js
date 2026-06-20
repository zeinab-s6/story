import db from '../db/database.js';

const insertFeedbackStmt = db.prepare(`
  INSERT INTO feedback (story_id, rating, note, created_at)
  VALUES (@storyId, @rating, @note, @createdAt)
`);

const getFeedbackForStoryStmt = db.prepare(`
  SELECT * FROM feedback WHERE story_id = ? ORDER BY created_at DESC
`);

const storyExistsStmt = db.prepare('SELECT id FROM stories WHERE id = ?');

export function saveFeedback(storyId, rating, note) {
  const story = storyExistsStmt.get(storyId);
  if (!story) return null;

  const result = insertFeedbackStmt.run({
    storyId,
    rating,
    note: note ?? null,
    createdAt: new Date().toISOString(),
  });

  return result.lastInsertRowid;
}

export function getFeedbackForStory(storyId) {
  const rows = getFeedbackForStoryStmt.all(storyId);
  return rows.map((row) => ({
    id: row.id,
    storyId: row.story_id,
    rating: row.rating,
    note: row.note,
    createdAt: row.created_at,
  }));
}
