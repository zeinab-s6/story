import env from '../config/env.js';

export function adminAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: 'دسترسی ادمین نیاز به توکن دارد.',
    });
  }

  const token = authHeader.slice(7);

  if (!env.ADMIN_TOKEN || env.ADMIN_TOKEN === 'change-this-admin-token') {
    if (env.isProduction) {
      return res.status(503).json({
        success: false,
        error: 'توکن ادمین در production تنظیم نشده است.',
      });
    }
  }

  if (token !== env.ADMIN_TOKEN) {
    return res.status(403).json({
      success: false,
      error: 'توکن ادمین نامعتبر است.',
    });
  }

  return next();
}

export default adminAuth;
