import rateLimit from 'express-rate-limit';
import env from '../config/env.js';

export const apiRateLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  handler(_req, res) {
    res.status(429).json({
      success: false,
      error: 'تعداد درخواست‌ها زیاد است. لطفاً کمی بعد دوباره تلاش کنید.',
    });
  },
});

export default apiRateLimiter;
