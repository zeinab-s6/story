import env from '../config/env.js';

export function errorHandler(err, _req, res, _next) {
  const status = err.statusCode || err.status || 500;

  const response = {
    success: false,
    error: err.message || 'خطای داخلی سرور. لطفاً دوباره تلاش کنید.',
  };

  if (env.isDevelopment) {
    response.details = err.details || err.stack || err.cause?.message;
  } else if (err.code === 'IVIRA_CONNECT_FAILED' || err.code === 'IVIRA_TIMEOUT') {
    response.hint = err.message;
  }

  if (err.code) {
    response.code = err.code;
  }

  res.status(status).json(response);
}

export function notFoundHandler(_req, res) {
  res.status(404).json({
    success: false,
    error: 'مسیر درخواستی پیدا نشد.',
  });
}

export default errorHandler;
