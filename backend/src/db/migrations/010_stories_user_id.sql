ALTER TABLE stories ADD COLUMN user_id INTEGER REFERENCES users(id);
CREATE INDEX IF NOT EXISTS idx_stories_user_id ON stories(user_id);
