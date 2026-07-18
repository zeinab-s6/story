import {
  bindDeviceAccount,
  getDeviceBindingByAndroidHash,
} from '../repositories/deviceBindingRepository.js';

export const DEVICE_BINDING_ERROR_CODES = {
  DEVICE_ACCOUNT_BOUND: 'DEVICE_ACCOUNT_BOUND',
};

export const DEVICE_BINDING_MESSAGES = {
  [DEVICE_BINDING_ERROR_CODES.DEVICE_ACCOUNT_BOUND]:
    'شما قبلاً با یک ایمیل دیگر وارد شده‌اید.',
};

export function assertDeviceAccountAccess({ androidIdHash, userId }) {
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

  return {
    allowed: false,
    code: DEVICE_BINDING_ERROR_CODES.DEVICE_ACCOUNT_BOUND,
    error: DEVICE_BINDING_MESSAGES[DEVICE_BINDING_ERROR_CODES.DEVICE_ACCOUNT_BOUND],
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
