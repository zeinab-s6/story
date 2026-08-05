/**
 * OTP / SMS gateway.
 * OTP_MODE=mock      → fixed code (OTP_MOCK_CODE), no SMS
 * OTP_MODE=kavenegar → Kavenegar verify/lookup with SMS_OTP_TEMPLATE
 */

import env from '../config/env.js';

const otpStore = new Map();

const OTP_TTL_MS = 5 * 60 * 1000;
const OTP_COOLDOWN_MS = 60 * 1000;

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
 * Accept plain Kavenegar keys or hex-encoded tokens from the panel.
 */
function resolveKavenegarApiKey() {
  const raw = env.KAVENEGAR_API_KEY;
  if (!raw) return '';
  if (/^[0-9a-fA-F]+$/.test(raw) && raw.length % 2 === 0 && raw.length >= 40) {
    try {
      const decoded = Buffer.from(raw, 'hex').toString('utf8');
      if (decoded && /^[\x20-\x7E]+$/.test(decoded)) {
        return decoded;
      }
    } catch {
      /* use raw */
    }
  }
  return raw;
}

async function sendSmsViaKavenegar(phone, code) {
  const apiKey = resolveKavenegarApiKey();
  const template = env.SMS_OTP_TEMPLATE || 'lalaByesignup';

  if (!apiKey) {
    const error = new Error('کلید API کاوه‌نگار تنظیم نشده است.');
    error.statusCode = 500;
    throw error;
  }

  const params = new URLSearchParams({
    receptor: phone,
    token: code,
    template,
  });

  const url = `https://api.kavenegar.com/v1/${encodeURIComponent(apiKey)}/verify/lookup.json?${params.toString()}`;

  let response;
  try {
    response = await fetch(url, { method: 'GET' });
  } catch (err) {
    const error = new Error('خطا در اتصال به سرویس پیامک کاوه‌نگار.');
    error.statusCode = 502;
    if (env.isDevelopment) {
      error.details = err.message;
    }
    throw error;
  }

  let payload = null;
  try {
    payload = await response.json();
  } catch {
    const error = new Error('پاسخ نامعتبر از کاوه‌نگار.');
    error.statusCode = 502;
    throw error;
  }

  const returnStatus = payload?.return?.status;
  const returnMessage = payload?.return?.message;

  if (!response.ok || (returnStatus != null && Number(returnStatus) !== 200)) {
    const error = new Error(
      returnMessage
        ? `ارسال پیامک ناموفق بود: ${returnMessage}`
        : 'ارسال پیامک ناموفق بود.',
    );
    error.statusCode = 502;
    if (env.isDevelopment) {
      error.details = JSON.stringify(payload?.return || payload || {}).slice(0, 400);
    }
    throw error;
  }

  return { sent: true, provider: 'kavenegar' };
}

async function sendSms(phone, code) {
  if (env.OTP_MODE === 'mock') {
    console.info(`[otp:mock] SMS to ${phone}: code=${code}`);
    return { sent: true, provider: 'mock' };
  }

  if (env.OTP_MODE === 'kavenegar') {
    return sendSmsViaKavenegar(phone, code);
  }

  throw new Error(`حالت OTP نامعتبر است: ${env.OTP_MODE}`);
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
      status: err.statusCode || 502,
    };
  }

  return {
    ok: true,
    phone,
    expiresInSec: Math.floor(OTP_TTL_MS / 1000),
    // Prefill OTP input on login page after successful send.
    defaultCode: code,
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
