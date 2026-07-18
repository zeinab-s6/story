import { Router } from 'express';
import env from '../config/env.js';
import { validateAuthInput } from '../validators/authValidator.js';
import { hashPassword, verifyPassword } from '../services/passwordService.js';
import { signToken } from '../services/tokenService.js';
import {
  createUser,
  getUserByEmail,
  getUserById,
  toPublicUser,
  updateUserChildProfile,
} from '../repositories/userRepository.js';
import { userAuth } from '../middleware/userAuth.js';
import { validateChildProfileInput } from '../validators/childProfileValidator.js';
import { getChildAvatarUrl } from '../catalog/childAvatars.js';
import { validateQuotaQuery } from '../validators/storyInputValidator.js';
import { resolveDeviceIdentity, registerDeviceVisit, getQuotaStatus } from '../services/quotaService.js';
import {
  assertDeviceAccountAccess,
  ensureDeviceAccountBinding,
} from '../services/deviceBindingService.js';

const router = Router();

function resolveAuthDeviceIdentity(body) {
  const validation = validateQuotaQuery({
    deviceId: body?.deviceId,
    androidId: body?.androidId,
  });

  if (!validation.valid) {
    return null;
  }

  return resolveDeviceIdentity({
    ...validation.data,
    deviceName: body?.deviceName,
  });
}

function attachDeviceToUser(userId, deviceIdentity) {
  if (!deviceIdentity || !deviceIdentity.androidIdHash) {
    return;
  }

  ensureDeviceAccountBinding({
    androidIdHash: deviceIdentity.androidIdHash,
    userId,
    deviceId: deviceIdentity.deviceId,
  });

  registerDeviceVisit({
    userId,
    ...deviceIdentity,
  });
}

router.post('/register', (req, res) => {
  const validation = validateAuthInput(req.body, 'register');

  if (!validation.valid) {
    return res.status(400).json({
      success: false,
      error: validation.errors[0],
      ...(env.isDevelopment && { details: validation.errors.join(' | ') }),
    });
  }

  const { email, password, displayName } = validation.data;
  const deviceIdentity = resolveAuthDeviceIdentity(req.body);
  const deviceCheck = assertDeviceAccountAccess({
    androidIdHash: deviceIdentity?.androidIdHash ?? null,
    userId: null,
  });

  if (!deviceCheck.allowed) {
    return res.status(403).json({
      success: false,
      code: deviceCheck.code,
      error: deviceCheck.error,
    });
  }

  const existing = getUserByEmail(email);

  if (existing) {
    return res.status(409).json({
      success: false,
      error: 'این ایمیل قبلاً ثبت شده است.',
    });
  }

  const user = createUser({
    email,
    passwordHash: hashPassword(password),
    displayName,
  });

  const token = signToken({ userId: user.id });

  attachDeviceToUser(user.id, deviceIdentity);

  const quota = deviceIdentity
    ? getQuotaStatus({
        userId: user.id,
        ...deviceIdentity,
      })
    : null;

  return res.status(201).json({
    success: true,
    token,
    user: toPublicUser(user),
    message: 'ثبت‌نام با موفقیت انجام شد.',
    ...(quota && { quota }),
  });
});

router.post('/login', (req, res) => {
  const validation = validateAuthInput(req.body, 'login');

  if (!validation.valid) {
    return res.status(400).json({
      success: false,
      error: validation.errors[0],
      ...(env.isDevelopment && { details: validation.errors.join(' | ') }),
    });
  }

  const { email, password } = validation.data;
  const deviceIdentity = resolveAuthDeviceIdentity(req.body);
  const user = getUserByEmail(email);

  if (!user) {
    return res.status(401).json({
      success: false,
      error: 'حساب کاربری خود را ایجاد کنید.',
    });
  }

  if (!verifyPassword(password, user.passwordHash)) {
    return res.status(401).json({
      success: false,
      error: 'ایمیل یا رمز عبور اشتباه است.',
    });
  }

  const deviceCheck = assertDeviceAccountAccess({
    androidIdHash: deviceIdentity?.androidIdHash ?? null,
    userId: user.id,
  });

  if (!deviceCheck.allowed) {
    return res.status(403).json({
      success: false,
      code: deviceCheck.code,
      error: deviceCheck.error,
    });
  }

  const token = signToken({ userId: user.id });

  attachDeviceToUser(user.id, deviceIdentity);

  const quota = deviceIdentity
    ? getQuotaStatus({
        userId: user.id,
        ...deviceIdentity,
      })
    : null;

  return res.json({
    success: true,
    token,
    user: toPublicUser(user),
    message: 'خوش آمدید!',
    ...(quota && { quota }),
  });
});

router.get('/me', userAuth, (req, res) => {
  const deviceValidation = validateQuotaQuery({
    deviceId: req.query.deviceId,
    androidId: req.query.androidId,
  });

  if (deviceValidation.valid) {
    const deviceIdentity = resolveDeviceIdentity({
      ...deviceValidation.data,
      deviceName: req.query.deviceName,
    });
    attachDeviceToUser(req.user.id, deviceIdentity);

    const quota = getQuotaStatus({
      userId: req.user.id,
      ...deviceIdentity,
    });

    return res.json({
      success: true,
      user: req.user,
      quota,
    });
  }

  return res.json({
    success: true,
    user: req.user,
  });
});

router.patch('/child-profile', userAuth, (req, res) => {
  const validation = validateChildProfileInput(req.body);

  if (!validation.valid) {
    return res.status(400).json({
      success: false,
      error: validation.errors[0],
      ...(env.isDevelopment && { details: validation.errors.join(' | ') }),
    });
  }

  const { childGender, childName } = validation.data;
  const childAvatarUrl = childGender ? getChildAvatarUrl(childGender) : undefined;
  const user = updateUserChildProfile({
    userId: req.user.id,
    childGender,
    childAvatarUrl,
    childName,
  });

  return res.json({
    success: true,
    user: toPublicUser(user),
    message: 'پروفایل فرزند ذخیره شد.',
  });
});

router.post('/logout', (_req, res) => {
  return res.json({
    success: true,
    message: 'با موفقیت خارج شدید.',
  });
});

export default router;
