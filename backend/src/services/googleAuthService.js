import env from '../config/env.js';

/**
 * Verify Google ID token (GIS credential) and return profile fields.
 */
export async function verifyGoogleIdToken(idToken) {
  const token = String(idToken || '').trim();
  const clientId = env.GOOGLE_CLIENT_ID;

  if (!clientId) {
    const error = new Error('ورود با گوگل پیکربندی نشده است.');
    error.statusCode = 503;
    throw error;
  }

  if (!token) {
    const error = new Error('توکن گوگل نامعتبر است.');
    error.statusCode = 400;
    throw error;
  }

  let payload;
  try {
    const response = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(token)}`,
    );
    payload = await response.json();
    if (!response.ok) {
      const error = new Error(payload?.error_description || payload?.error || 'تأیید ورود گوگل ناموفق بود.');
      error.statusCode = 401;
      throw error;
    }
  } catch (err) {
    if (err.statusCode) throw err;
    const error = new Error('خطا در ارتباط با سرویس گوگل.');
    error.statusCode = 502;
    if (env.isDevelopment) {
      error.details = err.message;
    }
    throw error;
  }

  if (payload.aud !== clientId) {
    const error = new Error('شناسه کلاینت گوگل با سرور هم‌خوان نیست.');
    error.statusCode = 401;
    throw error;
  }

  if (payload.email_verified === 'false' || payload.email_verified === false) {
    const error = new Error('ایمیل گوگل تأیید نشده است.');
    error.statusCode = 401;
    throw error;
  }

  if (!payload.sub || !payload.email) {
    const error = new Error('اطلاعات حساب گوگل ناقص است.');
    error.statusCode = 401;
    throw error;
  }

  return {
    googleId: String(payload.sub),
    email: String(payload.email).toLowerCase().trim(),
    displayName: String(payload.name || payload.given_name || 'والد').trim() || 'والد',
    avatarUrl: payload.picture ? String(payload.picture) : null,
  };
}

export default {
  verifyGoogleIdToken,
};
