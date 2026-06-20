import db from '../db/database.js';

const insertUserStmt = db.prepare(`
  INSERT INTO users (email, password_hash, display_name, avatar_url, child_gender, child_avatar_url, created_at)
  VALUES (@email, @passwordHash, @displayName, @avatarUrl, @childGender, @childAvatarUrl, @createdAt)
`);

const findByEmailStmt = db.prepare('SELECT * FROM users WHERE email = ?');
const findByIdStmt = db.prepare('SELECT * FROM users WHERE id = ?');
const updateChildProfileStmt = db.prepare(`
  UPDATE users SET
    child_gender = @childGender,
    child_avatar_url = @childAvatarUrl,
    child_name = @childName
  WHERE id = @userId
`);

function mapUserRow(row, includeHash = false) {
  if (!row) return null;

  const user = {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    avatarUrl: row.avatar_url,
    childGender: row.child_gender || null,
    childAvatarUrl: row.child_avatar_url || null,
    childName: row.child_name || null,
    createdAt: row.created_at,
  };

  if (includeHash) {
    user.passwordHash = row.password_hash;
  }

  return user;
}

export function createUser({ email, passwordHash, displayName, avatarUrl = null }) {
  const createdAt = new Date().toISOString();
  const result = insertUserStmt.run({
    email: email.toLowerCase().trim(),
    passwordHash,
    displayName: displayName.trim(),
    avatarUrl,
    childGender: null,
    childAvatarUrl: null,
    createdAt,
  });

  return findById(result.lastInsertRowid);
}

function findById(id) {
  return mapUserRow(findByIdStmt.get(id));
}

export function getUserByEmail(email) {
  return mapUserRow(findByEmailStmt.get(email.toLowerCase().trim()), true);
}

export function getUserById(id) {
  return findById(Number(id));
}

export function updateUserChildProfile({ userId, childGender, childAvatarUrl, childName }) {
  const current = findById(userId);
  if (!current) return null;

  updateChildProfileStmt.run({
    userId,
    childGender: childGender ?? current.childGender,
    childAvatarUrl: childAvatarUrl ?? current.childAvatarUrl,
    childName: childName !== undefined ? childName : current.childName,
  });
  return findById(userId);
}

export function toPublicUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
    childGender: user.childGender || null,
    childAvatarUrl: user.childAvatarUrl || null,
    childName: user.childName || null,
    createdAt: user.createdAt,
  };
}
