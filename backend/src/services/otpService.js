/**
 * OTP via Kavenegar Verify Lookup (پنل کاوه‌نگار).
 * @see https://kavenegar.com/rest.html
 *
 * GET /v1/{API-KEY}/verify/lookup.json?receptor=&token=&template=
 */
import { env } from '../config/env.js';

const otpStore = new Map();

const OTP_TTL_MS = 5 * 60 * 1000;
const OTP_COOLDOWN_MS = 60 * 1000;
const KAVENEGAR_LOOKUP_URL = 'https://api.kavenegar.com/v1';

const KAVENEGAR_LOOKUP_ERRORS = {
  418: 'اعتبار حساب کاوه‌نگار کافی نیست.',
  422: 'داده‌های ارسالی قابل پردازش نیست.',
  424: 'الگوی پیامک پیدا نشد یا هنوز تأیید نشده است.',
  426: 'برای این سرویس باید سرویس پیشرفته کاوه‌نگار فعال باشد.',
  428: 'ارسال کد از طریق تماس تلفنی برای این توکن امکان‌پذیر نیست.',
  431: 'ساختار کد OTP نامعتبر است.',
  432: 'پارامتر %token در متن الگو تعریف نشده است.',
  607: 'نام تگ ارسالی اشتباه است.',
};

function normalizePhone(raw) {
  const digits = String(raw || '').replace(/\D/g, '');
  if (digits.length === 10 && digits.startsWith('9')) {
    return `0${digits}`;
  }
  if (digits.length === 12 && digits.startsWith('98')) {
    return `0${digits.slice(2)}`;
  }
  if (digits.length === 11 && digits.startsWith('09')) {
    return digits;
  }
  return null;
}

function generateCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

/** Kavenegar API key goes in the URL path as-is (often a hex string). */
function resolveKavenegarApiKey() {
  return String(env.KAVENEGAR_API_KEY || '').trim();
}

function mapKavenegarError(status, fallbackMessage) {
  return KAVENEGAR_LOOKUP_ERRORS[Number(status)] || fallbackMessage || 'ارسال پیامک با خطا مواجه شد.';
}

async function sendSmsViaKavenegar(phone, code) {
  const apiKey = resolveKavenegarApiKey();
  const template = env.SMS_OTP_TEMPLATE || 'lalaByesignup';

  if (!apiKey) {
    return { sent: false, error: 'KAVENEGAR_API_KEY تنظیم نشده است.' };
  }

  const params = new URLSearchParams({
    receptor: phone,
    token: code,
    template,
    type: 'sms',
  });

  const url = `${KAVENEGAR_LOOKUP_URL}/${apiKey}/verify/lookup.json?${params.toString()}`;

  let response;
  try {
    response = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
  } catch (err) {
    console.error('[otp:kavenegar] network error:', err.message);
    return { sent: false, error: 'اتصال به سرویس پیامک برقرار نشد.' };
  }

  let payload;
  try {
    payload = await response.json();
  } catch {
    return { sent: false, error: 'پاسخ نامعتبر از سرویس پیامک.' };
  }

  const returnStatus = Number(payload?.return?.status);
  const returnMessage = payload?.return?.message;

  if (!response.ok || returnStatus !== 200) {
    console.error('[otp:kavenegar] lookup failed:', returnStatus, returnMessage);
    return {
      sent: false,
      error: mapKavenegarError(returnStatus, returnMessage),
    };
  }

  const entry = payload?.entries?.[0];
  if (!entry) {
    return { sent: false, error: 'پاسخ خالی از سرویس پیامک.' };
  }

  console.info('[otp:kavenegar] sent', { phone, messageId: entry.messageid, template });
  return { sent: true, provider: 'kavenegar', messageId: entry.messageid };
}

export async function requestOtp(rawPhone) {
  const phone = normalizePhone(rawPhone);
  if (!phone) {
    return { ok: false, status: 400, error: 'شماره موبایل معتبر نیست (مثال: 09121234567).' };
  }

  const now = Date.now();
  const existing = otpStore.get(phone);

  if (existing && existing.sentAt && now - existing.sentAt < OTP_COOLDOWN_MS) {
    const waitSec = Math.ceil((OTP_COOLDOWN_MS - (now - existing.sentAt)) / 1000);
    return {
      ok: false,
      status: 429,
      error: `لطفاً ${waitSec} ثانیه دیگر دوباره تلاش کنید.`,
    };
  }

  const code = generateCode();
  otpStore.set(phone, {
    code,
    expiresAt: now + OTP_TTL_MS,
    sentAt: now,
  });

  const smsResult = await sendSmsViaKavenegar(phone, code);

  if (!smsResult.sent) {
    otpStore.delete(phone);
    return {
      ok: false,
      status: 502,
      error: smsResult.error || 'ارسال پیامک ناموفق بود.',
    };
  }

  return {
    ok: true,
    phone,
    expiresInSec: Math.floor(OTP_TTL_MS / 1000),
  };
}

export function verifyOtpCode(rawPhone, rawCode) {
  const phone = normalizePhone(rawPhone);
  const code = String(rawCode || '').replace(/\D/g, '');

  if (!phone) {
    return { ok: false, status: 400, error: 'شماره موبایل معتبر نیست.' };
  }

  if (!/^\d{4,8}$/.test(code)) {
    return { ok: false, status: 400, error: 'کد تأیید باید ۴ تا ۸ رقم باشد.' };
  }

  const entry = otpStore.get(phone);

  if (!entry) {
    return { ok: false, status: 400, error: 'ابتدا درخواست دریافت کد بدهید.' };
  }

  if (Date.now() > entry.expiresAt) {
    otpStore.delete(phone);
    return { ok: false, status: 400, error: 'کد منقضی شده است. دوباره درخواست بدهید.' };
  }

  if (entry.code !== code) {
    entry.attempts = (entry.attempts || 0) + 1;
    if (entry.attempts >= 5) {
      otpStore.delete(phone);
      return { ok: false, status: 400, error: 'تعداد تلاش‌ها زیاد شد. دوباره درخواست کد بدهید.' };
    }
    return { ok: false, status: 400, error: 'کد تأیید اشتباه است.' };
  }

  otpStore.delete(phone);
  return { ok: true, phone };
}

export default {
  requestOtp,
  verifyOtpCode,
};
