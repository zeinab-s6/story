/**
 * OTP / SMS gateway abstraction.
 * OTP_MODE=mock — fixed code for local/dev (OTP_MOCK_CODE).
 * OTP_MODE=sms — Melipayamak shared pattern (کنسول ملی‌پیامک).
 */

import env from '../config/env.js';

const otpStore = new Map();

const OTP_TTL_MS = 5 * 60 * 1000;
const OTP_COOLDOWN_MS = 60 * 1000;
const MELIPAYAMAK_SHARED_URL = 'https://console.melipayamak.com/api/send/shared';

function normalizePhone(phone) {
  let digits = String(phone || '').replace(/\D/g, '');
  if (digits.startsWith('98') && digits.length === 12) {
    digits = `0${digits.slice(2)}`;
  }
  if (digits.startsWith('9') && digits.length === 10) {
    digits = `0${digits}`;
  }
  return digits;
}

function isValidIranMobile(phone) {
  return /^09\d{9}$/.test(phone);
}

function generateCode() {
  if (env.OTP_MODE === 'mock') {
    return env.OTP_MOCK_CODE;
  }
  return String(Math.floor(100000 + Math.random() * 900000));
}

/**
 * Melipayamak shared-pattern SMS (خط خدماتی اشتراکی).
 * @param {string} phone
 * @param {string} code
 */
async function sendMelipayamakSms(phone, code) {
  const token = env.MELIPAYAMAK_TOKEN;
  const bodyId = env.MELIPAYAMAK_BODY_ID;

  if (!token) {
    throw new Error('توکن ملی‌پیامک پیکربندی نشده است.');
  }
  if (!bodyId) {
    throw new Error(
      'کد متن الگوی ملی‌پیامک (MELIPAYAMAK_BODY_ID) تنظیم نشده است. ' +
        'در پنل، ستون «کد متن» کنار الگوی lalaByesignup را وارد کنید.'
    );
  }

  const response = await fetch(`${MELIPAYAMAK_SHARED_URL}/${token}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      bodyId,
      to: phone,
      args: [code],
    }),
  });

  let data = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    const detail = (data && (data.status || data.message || data.error)) || response.statusText;
    throw new Error(detail ? `ارسال پیامک ناموفق بود: ${detail}` : 'ارسال پیامک ناموفق بود.');
  }

  const status = data && data.status != null ? String(data.status).trim() : '';
  if (status) {
    throw new Error(status);
  }

  const recId = Number(data && data.recId);
  if (!Number.isFinite(recId) || recId <= 0) {
    throw new Error('ارسال پیامک ناموفق بود.');
  }

  return {
    sent: true,
    provider: 'melipayamak',
    recId: String(recId),
    pattern: env.MELIPAYAMAK_PATTERN_NAME || undefined,
  };
}

/**
 * @param {string} phone
 * @param {string} code
 */
async function sendSms(phone, code) {
  if (env.OTP_MODE === 'mock') {
    console.info(`[otp:mock] SMS to ${phone}: code=${code}`);
    return { sent: true, provider: 'mock' };
  }

  if (env.OTP_MODE === 'sms') {
    return sendMelipayamakSms(phone, code);
  }

  throw new Error('سرویس پیامک هنوز پیکربندی نشده است.');
}

export function validatePhone(rawPhone) {
  const phone = normalizePhone(rawPhone);
  if (!isValidIranMobile(phone)) {
    return { valid: false, error: 'شماره موبایل معتبر نیست. مثال: ۰۹۱۲۳۴۵۶۷۸۹' };
  }
  return { valid: true, phone };
}

export async function requestOtp(rawPhone) {
  const validation = validatePhone(rawPhone);
  if (!validation.valid) {
    return { ok: false, error: validation.error, status: 400 };
  }

  const { phone } = validation;
  const existing = otpStore.get(phone);
  const now = Date.now();

  if (existing && existing.sentAt && now - existing.sentAt < OTP_COOLDOWN_MS) {
    const waitSec = Math.ceil((OTP_COOLDOWN_MS - (now - existing.sentAt)) / 1000);
    return {
      ok: false,
      error: `لطفاً ${waitSec} ثانیه صبر کنید و دوباره درخواست دهید.`,
      status: 429,
    };
  }

  const code = generateCode();
  otpStore.set(phone, {
    code,
    expiresAt: now + OTP_TTL_MS,
    sentAt: now,
    attempts: 0,
  });

  try {
    await sendSms(phone, code);
  } catch (err) {
    otpStore.delete(phone);
    return {
      ok: false,
      error: err.message || 'ارسال پیامک ناموفق بود.',
      status: 502,
    };
  }

  return {
    ok: true,
    phone,
    expiresInSec: Math.floor(OTP_TTL_MS / 1000),
    ...(env.OTP_MODE === 'mock' ? { debugHint: code } : {}),
  };
}

export function verifyOtpCode(rawPhone, rawCode) {
  const validation = validatePhone(rawPhone);
  if (!validation.valid) {
    return { ok: false, error: validation.error, status: 400 };
  }

  const code = String(rawCode || '').trim();
  if (!/^\d{4,8}$/.test(code)) {
    return { ok: false, error: 'کد تأیید معتبر نیست.', status: 400 };
  }

  const { phone } = validation;
  const entry = otpStore.get(phone);

  if (!entry) {
    return { ok: false, error: 'ابتدا کد تأیید را درخواست کنید.', status: 400 };
  }

  if (Date.now() > entry.expiresAt) {
    otpStore.delete(phone);
    return { ok: false, error: 'کد منقضی شده است. دوباره درخواست دهید.', status: 400 };
  }

  entry.attempts += 1;
  if (entry.attempts > 5) {
    otpStore.delete(phone);
    return { ok: false, error: 'تعداد تلاش بیش از حد. دوباره کد بگیرید.', status: 429 };
  }

  if (entry.code !== code) {
    return { ok: false, error: 'کد تأیید اشتباه است.', status: 401 };
  }

  otpStore.delete(phone);
  return { ok: true, phone };
}

export default {
  validatePhone,
  requestOtp,
  verifyOtpCode,
};
