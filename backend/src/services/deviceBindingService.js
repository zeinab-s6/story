import {
  bindDeviceAccount,
  getDeviceBindingByAndroidHash,
} from '../repositories/deviceBindingRepository.js';

export const DEVICE_BINDING_ERROR_CODES = {
  DEVICE_ACCOUNT_BOUND: 'DEVICE_ACCOUNT_BOUND',
};

export const DEVICE_BINDING_MESSAGES = {
  register:
    'روی این گوشی قبلاً با یک ایمیل دیگر ثبت‌نام شده است. فقط همان حساب قابل استفاده است.',
  login:
    'این گوشی به حساب دیگری متصل است. فقط با همان ایمیل می‌توانید وارد شوید.',
  default:
    'روی این گوشی قبلاً با یک ایمیل دیگر حساب ساخته شده است.',
};

export function assertDeviceAccountAccess({ androidIdHash, userId, context = 'default' }) {
  if (!androidIdHash) {
    return { allowed: true };
  }

  const binding = getDeviceBindingByAndroidHash(androidIdHash);
  if (!binding) {
    return { allowed: true };
  }

  if (userId != null && Number(binding.userId) === Number(userId)) {
    return { allowed: true };
  }

  const message =
    DEVICE_BINDING_MESSAGES[context] || DEVICE_BINDING_MESSAGES.default;

  return {
    allowed: false,
    code: DEVICE_BINDING_ERROR_CODES.DEVICE_ACCOUNT_BOUND,
    error: message,
  };
}

export function ensureDeviceAccountBinding({ androidIdHash, userId, deviceId = null }) {
  if (!androidIdHash || userId == null) return null;
  return bindDeviceAccount({ androidIdHash, userId, deviceId });
}

export default {
  DEVICE_BINDING_ERROR_CODES,
  DEVICE_BINDING_MESSAGES,
  assertDeviceAccountAccess,
  ensureDeviceAccountBinding,
};
