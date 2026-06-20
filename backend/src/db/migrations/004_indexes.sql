CREATE INDEX IF NOT EXISTS idx_stories_created_at ON stories(created_at);
CREATE INDEX IF NOT EXISTS idx_stories_session_id ON stories(session_id);
CREATE INDEX IF NOT EXISTS idx_stories_goal ON stories(goal);
CREATE INDEX IF NOT EXISTS idx_feedback_story_id ON feedback(story_id);
CREATE INDEX IF NOT EXISTS idx_usage_logs_story_id ON usage_logs(story_id);
CREATE INDEX IF NOT EXISTS idx_usage_logs_created_at ON usage_logs(created_at);
