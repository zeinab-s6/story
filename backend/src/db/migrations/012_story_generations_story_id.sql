ALTER TABLE story_generations ADD COLUMN story_id INTEGER REFERENCES stories(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_story_generations_story_id ON story_generations(story_id);
