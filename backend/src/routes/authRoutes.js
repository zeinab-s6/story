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

const router = Router();

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

  return res.status(201).json({
    success: true,
    token,
    user: toPublicUser(user),
    message: 'ثبت‌نام با موفقیت انجام شد.',
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
  const user = getUserByEmail(email);

  if (!user || !verifyPassword(password, user.passwordHash)) {
    return res.status(401).json({
      success: false,
      error: 'ایمیل یا رمز عبور اشتباه است.',
    });
  }

  const token = signToken({ userId: user.id });

  return res.json({
    success: true,
    token,
    user: toPublicUser(user),
    message: 'خوش آمدید!',
  });
});

router.get('/me', userAuth, (req, res) => {
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
