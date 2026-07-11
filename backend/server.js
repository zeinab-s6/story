import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import { fileURLToPath } from 'url';
import env from './src/config/env.js';
import getCorsOptions from './src/config/cors.js';
import { closeDatabase } from './src/db/database.js';
import { apiRateLimiter } from './src/middleware/rateLimiter.js';
import { requestLogger, logger } from './src/middleware/requestLogger.js';
import { errorHandler, notFoundHandler } from './src/middleware/errorHandler.js';
import storyRoutes from './src/routes/storyRoutes.js';
import feedbackRoutes from './src/routes/feedbackRoutes.js';
import adminRoutes from './src/routes/adminRoutes.js';
import voiceRoutes from './src/routes/voiceRoutes.js';
import authRoutes from './src/routes/authRoutes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendDir = path.join(__dirname, '../frontend');

const app = express();

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'blob:'],
        connectSrc: ["'self'"],
        mediaSrc: ["'self'", 'blob:'],
        fontSrc: ["'self'", 'data:'],
      },
    },
  }),
);
app.use(cors(getCorsOptions()));
app.use(express.json({ limit: '64kb' }));
app.use(requestLogger);
app.use('/api', apiRateLimiter);

app.get('/health', (_req, res) => {
  res.json({
    success: true,
    service: 'storytelling-backend',
    storyProvider: env.STORY_PROVIDER,
    ttsProvider: env.TTS_PROVIDER,
    environment: env.NODE_ENV,
    port: env.PORT,
  });
});

app.use('/api/stories', storyRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/voices', voiceRoutes);
app.use('/api/auth', authRoutes);

app.use(express.static(frontendDir, { index: false, extensions: ['html'] }));

function serveFrontendPage(filename) {
  return (_req, res) => {
    res.sendFile(path.join(frontendDir, filename));
  };
}

app.get('/', serveFrontendPage('login.html'));
app.get('/home', serveFrontendPage('index.html'));
app.get('/index', serveFrontendPage('index.html'));
app.get('/login', serveFrontendPage('login.html'));
app.get('/onboarding', serveFrontendPage('onboarding.html'));

app.use('/api', notFoundHandler);
app.use(notFoundHandler);
app.use(errorHandler);

/** @type {import('node:http').Server | null} */
let server = null;
let shuttingDown = false;

const MAX_LISTEN_RETRIES = 15;
const LISTEN_RETRY_MS = 400;

function onListening() {
  logger.info(
    { port: env.PORT, provider: env.STORY_PROVIDER, frontendDir },
    'lalaBye server started (API + frontend on same port)',
  );
}

function startServer(attempt = 0) {
  server = app.listen(env.PORT, onListening);

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE' && attempt < MAX_LISTEN_RETRIES) {
      logger.warn(
        { port: env.PORT, attempt: attempt + 1, max: MAX_LISTEN_RETRIES },
        'Port busy — retrying…',
      );
      try {
        server.close();
      } catch {
        // ignore
      }
      server = null;
      setTimeout(() => startServer(attempt + 1), LISTEN_RETRY_MS);
      return;
    }

    if (err.code === 'EADDRINUSE') {
      logger.error(
        {
          port: env.PORT,
          hint: 'پورت اشغال است. npm run dev را دوباره اجرا کن یا: netstat -ano | findstr ":3000 "',
        },
        'Port already in use',
      );
      process.exit(1);
    }

    throw err;
  });
}

startServer();

function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;

  logger.info({ signal }, 'Shutting down gracefully');

  if (!server) {
    closeDatabase();
    process.exit(0);
    return;
  }

  if (typeof server.closeAllConnections === 'function') {
    server.closeAllConnections();
  }

  server.close(() => {
    closeDatabase();
    logger.info('Server closed');
    process.exit(0);
  });

  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 2500);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
