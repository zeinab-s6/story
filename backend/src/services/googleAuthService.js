/**
 * Google Sign-In token verification.
 * Accepts GIS ID tokens or OAuth access tokens from the account picker.
 */

import env from '../config/env.js';

function googleNotConfigured() {
  return {
    ok: false,
    error: 'ورود با گوگل پیکربندی نشده است.',
    status: 503,
  };
}

async function fetchJson(url, options) {
  const response = await fetch(url, options);
  let data = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }
  return { response, data };
}

/**
 * @param {string} idToken
 */
async function verifyIdToken(idToken) {
  const { response, data } = await fetchJson(
    `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`,
  );

  if (!response.ok || !data?.sub) {
    return { ok: false, error: 'احراز هویت گوگل ناموفق بود.', status: 401 };
  }

  if (data.aud !== env.GOOGLE_CLIENT_ID) {
    return { ok: false, error: 'توکن گوگل برای این برنامه نیست.', status: 401 };
  }

  if (data.email_verified === 'false' || data.email_verified === false) {
    return { ok: false, error: 'ایمیل گوگل تأیید نشده است.', status: 401 };
  }

  return {
    ok: true,
    googleId: data.sub,
    email: String(data.email || '').toLowerCase().trim(),
    name: data.name || (data.email ? String(data.email).split('@')[0] : 'والد'),
    picture: data.picture || null,
  };
}

/**
 * @param {string} accessToken
 */
async function verifyAccessToken(accessToken) {
  const { response, data } = await fetchJson('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok || !data?.sub) {
    return { ok: false, error: 'احراز هویت گوگل ناموفق بود.', status: 401 };
  }

  if (data.email_verified === false) {
    return { ok: false, error: 'ایمیل گوگل تأیید نشده است.', status: 401 };
  }

  return {
    ok: true,
    googleId: data.sub,
    email: String(data.email || '').toLowerCase().trim(),
    name: data.name || (data.email ? String(data.email).split('@')[0] : 'والد'),
    picture: data.picture || null,
  };
}

/**
 * @param {{ idToken?: string, accessToken?: string }} input
 */
export async function verifyGoogleSignIn(input) {
  if (!env.GOOGLE_CLIENT_ID) {
    return googleNotConfigured();
  }

  const idToken = typeof input?.idToken === 'string' ? input.idToken.trim() : '';
  const accessToken = typeof input?.accessToken === 'string' ? input.accessToken.trim() : '';

  if (idToken) {
    return verifyIdToken(idToken);
  }

  if (accessToken) {
    return verifyAccessToken(accessToken);
  }

  return {
    ok: false,
    error: 'توکن گوگل ارسال نشده است.',
    status: 400,
  };
}

export function getGoogleAuthConfig() {
  const clientId = env.GOOGLE_CLIENT_ID || '';
  return {
    enabled: Boolean(clientId),
    clientId: clientId || null,
  };
}
