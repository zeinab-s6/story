import { verifyToken } from '../services/tokenService.js';
import { getUserById, toPublicUser } from '../repositories/userRepository.js';

export function userAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: 'برای دسترسی باید وارد شوید.',
    });
  }

  const token = authHeader.slice(7);
  const payload = verifyToken(token);

  if (!payload?.userId) {
    return res.status(401).json({
      success: false,
      error: 'نشست شما منقضی شده. دوباره وارد شوید.',
    });
  }

  const user = getUserById(payload.userId);

  if (!user) {
    return res.status(401).json({
      success: false,
      error: 'کاربر پیدا نشد.',
    });
  }

  req.user = toPublicUser(user);
  req.authToken = token;
  return next();
}

export function optionalUserAuth(req, _res, next) {
  const authHeader = req.headers.authorization;

  if (authHeader?.startsWith('Bearer ')) {
    const payload = verifyToken(authHeader.slice(7));
    if (payload?.userId) {
      const user = getUserById(payload.userId);
      if (user) {
        req.user = toPublicUser(user);
      }
    }
  }

  return next();
}
