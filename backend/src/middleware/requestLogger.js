import pino from 'pino';
import pinoHttp from 'pino-http';
import env from '../config/env.js';

const logger = pino({
  level: env.LOG_LEVEL,
  redact: ['req.headers.authorization', 'OPENAI_API_KEY'],
});

export const requestLogger = pinoHttp({
  logger,
  autoLogging: {
    ignore(req) {
      return req.url === '/health';
    },
  },
});

export { logger };
export default requestLogger;
