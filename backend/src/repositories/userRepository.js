import db from '../db/database.js';
import { hashPassword } from '../services/passwordService.js';

const insertUserStmt = db.prepare(`
  INSERT INTO users (email, password_hash, display_name, avatar_url, child_gender, child_avatar_url, phone, created_at)
  VALUES (@email, @passwordHash, @displayName, @avatarUrl, @childGender, @childAvatarUrl, @phone, @createdAt)
`);

const findByEmailStmt = db.prepare('SELECT * FROM users WHERE email = ?');
const findByPhoneStmt = db.prepare('SELECT * FROM users WHERE phone = ?');
const findByIdStmt = db.prepare('SELECT * FROM users WHERE id = ?');
const updateChildProfileStmt = db.prepare(`
  UPDATE users SET
    child_gender = @childGender,
    child_avatar_url = @childAvatarUrl,
    child_name = @childName,
    display_name = @displayName
  WHERE id = @userId
`);

function mapUserRow(row, includeHash = false) {
  if (!row) return null;

  const user = {
    id: row.id,
    email: row.email,
    phone: row.phone || null,
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

export function createUser({ email, passwordHash, displayName, avatarUrl = null, phone = null }) {
  const createdAt = new Date().toISOString();
  const result = insertUserStmt.run({
    email: email.toLowerCase().trim(),
    passwordHash,
    displayName: displayName.trim(),
    avatarUrl,
    childGender: null,
    childAvatarUrl: null,
    phone: phone || null,
    createdAt,
  });

  return findById(result.lastInsertRowid);
}

export function createOrGetUserByPhone(phone) {
  const existing = findByPhoneStmt.get(phone);
  if (existing) {
    return { user: mapUserRow(existing), created: false };
  }

  const syntheticEmail = `otp_${phone}@phone.lalabye.local`;
  const user = createUser({
    email: syntheticEmail,
    passwordHash: hashPassword(`otp:${phone}:${Date.now()}`),
    displayName: 'والد',
    phone,
  });

  return { user, created: true };
}

function findById(id) {
  return mapUserRow(findByIdStmt.get(id));
}

export function getUserByEmail(email) {
  return mapUserRow(findByEmailStmt.get(email.toLowerCase().trim()), true);
}

export function getUserByPhone(phone) {
  if (!phone) return null;
  return mapUserRow(findByPhoneStmt.get(phone), true);
}

export function getUserById(id) {
  return findById(Number(id));
}

export function updateUserChildProfile({
  userId,
  childGender,
  childAvatarUrl,
  childName,
  displayName,
}) {
  const current = findById(userId);
  if (!current) return null;

  updateChildProfileStmt.run({
    userId,
    childGender: childGender ?? current.childGender,
    childAvatarUrl: childAvatarUrl ?? current.childAvatarUrl,
    childName: childName !== undefined ? childName : current.childName,
    displayName: displayName !== undefined && displayName !== null
      ? displayName
      : current.displayName,
  });
  return findById(userId);
}

export function toPublicUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    email: user.email,
    phone: user.phone || null,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
    childGender: user.childGender || null,
    childAvatarUrl: user.childAvatarUrl || null,
    childName: user.childName || null,
    createdAt: user.createdAt,
  };
}
