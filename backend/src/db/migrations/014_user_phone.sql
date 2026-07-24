-- Phone-based OTP auth support
ALTER TABLE users ADD COLUMN phone TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
