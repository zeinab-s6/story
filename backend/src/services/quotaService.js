import env from '../config/env.js';
import { hashDeviceIdentifier } from '../utils/deviceHash.js';
import {
  countUserSuccessGenerationsToday,
  countDeviceSuccessGenerationsToday,
  recordSuccessfulGeneration,
} from '../repositories/quotaRepository.js';
import { upsertUserDevice } from '../repositories/deviceRepository.js';

export const QUOTA_ERROR_CODES = {
  AUTH_REQUIRED: 'AUTH_REQUIRED',
  QUOTA_DAILY_EXCEEDED: 'QUOTA_DAILY_EXCEEDED',
  DEVICE_DAILY_LIMIT_EXCEEDED: 'DEVICE_DAILY_LIMIT_EXCEEDED',
  STORY_GENERATION_FAILED: 'STORY_GENERATION_FAILED',
};

export const QUOTA_MESSAGES = {
  [QUOTA_ERROR_CODES.AUTH_REQUIRED]: 'برای ساخت قصه باید وارد شوید.',
  [QUOTA_ERROR_CODES.QUOTA_DAILY_EXCEEDED]:
    'استفاده امروزت به اتمام رسید!\nفردا دوباره می‌توانی داستان جدید بسازی.',
  [QUOTA_ERROR_CODES.DEVICE_DAILY_LIMIT_EXCEEDED]:
    'امروز روی این دستگاه حداکثر ۲ داستان ساخته شده است.\nفردا دوباره می‌توانید داستان جدید بسازید.',
  [QUOTA_ERROR_CODES.STORY_GENERATION_FAILED]: 'ساخت قصه ناموفق بود. لطفاً دوباره تلاش کن.',
};

export function getDailyStoryLimit() {
  return env.DAILY_STORY_LIMIT;
}

export function resolveDeviceIdentity({ deviceId, androidId, deviceName }) {
  const normalizedDeviceId = typeof deviceId === 'string' ? deviceId.trim() : '';
  const androidIdHash = hashDeviceIdentifier(androidId);
  return {
    deviceId: normalizedDeviceId,
    androidIdHash,
    deviceName: typeof deviceName === 'string' ? deviceName.trim().slice(0, 120) || null : null,
  };
}

export function getQuotaStatus({ userId, deviceId, androidIdHash }) {
  const dailyLimit = getDailyStoryLimit();
  const userUsedToday = countUserSuccessGenerationsToday(userId);
  const deviceUsedToday = countDeviceSuccessGenerationsToday({ deviceId, androidIdHash });

  return {
    dailyLimit,
    userUsedToday,
    userRemaining: Math.max(0, dailyLimit - userUsedToday),
    deviceUsedToday,
    deviceRemaining: Math.max(0, dailyLimit - deviceUsedToday),
    userExceeded: userUsedToday >= dailyLimit,
    deviceExceeded: deviceUsedToday >= dailyLimit,
  };
}

export function registerDeviceVisit({ userId, deviceId, androidIdHash, deviceName }) {
  upsertUserDevice({ userId, deviceId, androidIdHash, deviceName });
}

export function assertCanGenerateStory({ userId, deviceId, androidIdHash }) {
  const quota = getQuotaStatus({ userId, deviceId, androidIdHash });

  if (quota.userExceeded) {
    return {
      allowed: false,
      code: QUOTA_ERROR_CODES.QUOTA_DAILY_EXCEEDED,
      error: QUOTA_MESSAGES[QUOTA_ERROR_CODES.QUOTA_DAILY_EXCEEDED],
      quota,
    };
  }

  if (quota.deviceExceeded) {
    return {
      allowed: false,
      code: QUOTA_ERROR_CODES.DEVICE_DAILY_LIMIT_EXCEEDED,
      error: QUOTA_MESSAGES[QUOTA_ERROR_CODES.DEVICE_DAILY_LIMIT_EXCEEDED],
      quota,
    };
  }

  return { allowed: true, quota };
}

export function recordStoryGenerationSuccess({ userId, deviceId, androidIdHash }) {
  return recordSuccessfulGeneration({ userId, deviceId, androidIdHash, creditsUsed: 1 });
}

export default {
  QUOTA_ERROR_CODES,
  QUOTA_MESSAGES,
  getDailyStoryLimit,
  resolveDeviceIdentity,
  getQuotaStatus,
  registerDeviceVisit,
  assertCanGenerateStory,
  recordStoryGenerationSuccess,
};
