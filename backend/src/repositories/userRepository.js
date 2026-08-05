import db from '../db/database.js';
import { hashPassword } from '../services/passwordService.js';

const insertUserStmt = db.prepare(`
  INSERT INTO users (email, password_hash, display_name, avatar_url, child_gender, child_avatar_url, phone, google_id, created_at)
  VALUES (@email, @passwordHash, @displayName, @avatarUrl, @childGender, @childAvatarUrl, @phone, @googleId, @createdAt)
`);

const findByEmailStmt = db.prepare('SELECT * FROM users WHERE email = ?');
const findByPhoneStmt = db.prepare('SELECT * FROM users WHERE phone = ?');
const findByGoogleIdStmt = db.prepare('SELECT * FROM users WHERE google_id = ?');
const findByIdStmt = db.prepare('SELECT * FROM users WHERE id = ?');
const linkGoogleIdStmt = db.prepare(`
  UPDATE users SET
    google_id = @googleId,
    avatar_url = COALESCE(avatar_url, @avatarUrl),
    display_name = CASE
      WHEN display_name IS NULL OR display_name = '' OR display_name = 'والد' THEN @displayName
      ELSE display_name
    END
  WHERE id = @userId
`);
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
    googleId: row.google_id || null,
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

export function createUser({
  email,
  passwordHash,
  displayName,
  avatarUrl = null,
  phone = null,
  googleId = null,
}) {
  const createdAt = new Date().toISOString();
  const result = insertUserStmt.run({
    email: email.toLowerCase().trim(),
    passwordHash,
    displayName: displayName.trim(),
    avatarUrl,
    childGender: null,
    childAvatarUrl: null,
    phone: phone || null,
    googleId: googleId || null,
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

export function createOrGetUserByGoogle({ googleId, email, name, picture }) {
  if (!googleId) {
    throw new Error('googleId is required');
  }

  const byGoogle = findByGoogleIdStmt.get(googleId);
  if (byGoogle) {
    return { user: mapUserRow(byGoogle), created: false };
  }

  const normalizedEmail = email ? String(email).toLowerCase().trim() : '';
  if (normalizedEmail) {
    const byEmail = findByEmailStmt.get(normalizedEmail);
    if (byEmail) {
      linkGoogleIdStmt.run({
        userId: byEmail.id,
        googleId,
        avatarUrl: picture || null,
        displayName: (name && String(name).trim()) || byEmail.display_name || 'والد',
      });
      return { user: findById(byEmail.id), created: false };
    }
  }

  const fallbackEmail = normalizedEmail || `google_${googleId}@google.lalabye.local`;
  const user = createUser({
    email: fallbackEmail,
    passwordHash: hashPassword(`google:${googleId}:${Date.now()}`),
    displayName: (name && String(name).trim()) || 'والد',
    avatarUrl: picture || null,
    googleId,
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
    googleId: user.googleId || null,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
    childGender: user.childGender || null,
    childAvatarUrl: user.childAvatarUrl || null,
    childName: user.childName || null,
    createdAt: user.createdAt,
  };
}
