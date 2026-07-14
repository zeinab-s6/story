import dotenv from 'dotenv';

dotenv.config();

const NODE_ENV = process.env.NODE_ENV || 'development';
const isProduction = NODE_ENV === 'production';
const isDevelopment = NODE_ENV === 'development';

function parseBoolean(value, defaultValue = false) {
  if (value === undefined || value === null || value === '') {
    return defaultValue;
  }
  return ['true', '1', 'yes', 'on'].includes(String(value).toLowerCase());
}

function requireInProduction(name, value) {
  if (isProduction && (!value || (typeof value === 'string' && !value.trim()))) {
    throw new Error(`متغیر محیطی "${name}" در production الزامی است.`);
  }
}

const STORY_PROVIDER = (process.env.STORY_PROVIDER || 'mock').toLowerCase();

if (!['mock', 'openai'].includes(STORY_PROVIDER)) {
  throw new Error('STORY_PROVIDER باید mock یا openai باشد.');
}

const TTS_PROVIDER = (process.env.TTS_PROVIDER || 'openai').toLowerCase();

if (!['mock', 'openai', 'elevenlabs', 'ivira'].includes(TTS_PROVIDER)) {
  throw new Error('TTS_PROVIDER باید mock، openai، elevenlabs یا ivira باشد.');
}

const OPENAI_TTS_MODEL = (process.env.OPENAI_TTS_MODEL || 'gpt-4o-mini-tts').trim();
const OPENAI_TTS_VOICE = (process.env.OPENAI_TTS_VOICE || 'alloy').trim();
const OPENAI_TTS_FORMAT = (process.env.OPENAI_TTS_FORMAT || 'mp3').trim();

requireInProduction('FRONTEND_ORIGIN', process.env.FRONTEND_ORIGIN);
requireInProduction('DATABASE_PATH', process.env.DATABASE_PATH);
requireInProduction('STORY_PROVIDER', process.env.STORY_PROVIDER);
requireInProduction('TTS_PROVIDER', process.env.TTS_PROVIDER);

if (STORY_PROVIDER === 'openai') {
  if (!process.env.OPENAI_API_KEY?.trim()) {
    throw new Error('OPENAI_API_KEY برای STORY_PROVIDER=openai الزامی است.');
  }
  if (!process.env.OPENAI_MODEL?.trim()) {
    throw new Error('OPENAI_MODEL برای STORY_PROVIDER=openai الزامی است.');
  }
}

if (TTS_PROVIDER === 'openai') {
  const ttsApiKey = process.env.OPENAI_TTS_API_KEY?.trim() || process.env.OPENAI_API_KEY?.trim();
  if (!ttsApiKey) {
    throw new Error('OPENAI_API_KEY یا OPENAI_TTS_API_KEY برای TTS_PROVIDER=openai الزامی است.');
  }
  if (!OPENAI_TTS_MODEL) {
    throw new Error('OPENAI_TTS_MODEL برای TTS_PROVIDER=openai الزامی است.');
  }
  if (!OPENAI_TTS_VOICE) {
    throw new Error('OPENAI_TTS_VOICE برای TTS_PROVIDER=openai الزامی است.');
  }
}

const ELEVENLABS_API_KEY = (process.env.ELEVENLABS_API_KEY || '').trim();
const ELEVENLABS_VOICE_ID = (process.env.ELEVENLABS_VOICE_ID || '21m00Tcm4TlvDq8ikWAM').trim();
const ELEVENLABS_MODEL_ID = (process.env.ELEVENLABS_MODEL_ID || 'eleven_multilingual_v2').trim();
const ELEVENLABS_STABILITY = Number(process.env.ELEVENLABS_STABILITY) || 0.5;
const ELEVENLABS_SIMILARITY_BOOST = Number(process.env.ELEVENLABS_SIMILARITY_BOOST) || 0.75;

if (TTS_PROVIDER === 'elevenlabs') {
  if (!ELEVENLABS_API_KEY) {
    throw new Error('ELEVENLABS_API_KEY برای TTS_PROVIDER=elevenlabs الزامی است.');
  }
  if (!ELEVENLABS_VOICE_ID) {
    throw new Error('ELEVENLABS_VOICE_ID برای TTS_PROVIDER=elevenlabs الزامی است.');
  }
  if (!ELEVENLABS_MODEL_ID) {
    throw new Error('ELEVENLABS_MODEL_ID برای TTS_PROVIDER=elevenlabs الزامی است.');
  }
}

const IVIRA_TOKEN = (process.env.IVIRA_TOKEN || process.env.IVIRA_GATEWAY_TOKEN || '').trim();
const IVIRA_BASE_URL = (process.env.IVIRA_BASE_URL || 'https://partai.gw.isahab.ir').trim().replace(/\/$/, '');
const IVIRA_SERVICE_ID = (process.env.IVIRA_SERVICE_ID || '97192615-41ab-4b39-bd7b-324e353b9448').trim();
const IVIRA_SPEAKER = Number(process.env.IVIRA_SPEAKER) || 6;
const IVIRA_TIMEOUT_MS = Number(process.env.IVIRA_TIMEOUT_MS) || 60_000;
const IVIRA_CONNECT_TIMEOUT_MS = Number(process.env.IVIRA_CONNECT_TIMEOUT_MS) || 30_000;
const IVIRA_PROXY_URL = (process.env.IVIRA_PROXY_URL || process.env.HTTPS_PROXY || '').trim();
const IVIRA_FALLBACK_OPENAI = parseBoolean(process.env.IVIRA_FALLBACK_OPENAI, false);

if (TTS_PROVIDER === 'ivira') {
  if (!IVIRA_TOKEN) {
    throw new Error('IVIRA_TOKEN برای TTS_PROVIDER=ivira الزامی است.');
  }
  if (!Number.isInteger(IVIRA_SPEAKER) || IVIRA_SPEAKER < 1 || IVIRA_SPEAKER > 6) {
    throw new Error('IVIRA_SPEAKER باید عددی بین ۱ تا ۶ باشد.');
  }
}

export const env = {
  NODE_ENV,
  isProduction,
  isDevelopment,
  PORT: Number(process.env.PORT) || 3000,
  FRONTEND_ORIGIN: process.env.FRONTEND_ORIGIN || 'http://localhost:3000',
  DATABASE_PATH: process.env.DATABASE_PATH || './data/storytelling.sqlite',
  BACKUP_DIR: process.env.BACKUP_DIR || './data/backups',
  STORY_PROVIDER,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
  OPENAI_TTS_API_KEY: process.env.OPENAI_TTS_API_KEY || '',
  OPENAI_BASE_URL: process.env.OPENAI_BASE_URL || '',
  OPENAI_TTS_BASE_URL: process.env.OPENAI_TTS_BASE_URL || '',
  OPENAI_MODEL: process.env.OPENAI_MODEL || '',
  PROMPT_VERSION: process.env.PROMPT_VERSION || 'v1.0.0',
  TTS_PROVIDER,
  OPENAI_TTS_MODEL,
  OPENAI_TTS_VOICE,
  OPENAI_TTS_FORMAT,
  ELEVENLABS_API_KEY,
  ELEVENLABS_VOICE_ID,
  ELEVENLABS_MODEL_ID,
  ELEVENLABS_STABILITY,
  ELEVENLABS_SIMILARITY_BOOST,
  IVIRA_TOKEN,
  IVIRA_BASE_URL,
  IVIRA_SERVICE_ID,
  IVIRA_SPEAKER,
  IVIRA_TIMEOUT_MS,
  IVIRA_CONNECT_TIMEOUT_MS,
  IVIRA_PROXY_URL,
  IVIRA_FALLBACK_OPENAI,
  CUSTOM_VOICE_ENABLED: parseBoolean(process.env.CUSTOM_VOICE_ENABLED, false),
  AUDIO_STORAGE_DIR: process.env.AUDIO_STORAGE_DIR || './data/audio',
  STORY_BACKGROUND_AUDIO_PATH: process.env.STORY_BACKGROUND_AUDIO_PATH || '../frontend/images/audio/source.mp3',
  STORY_BACKGROUND_VOLUME: Number(process.env.STORY_BACKGROUND_VOLUME) || 0.14,
  VOICE_UPLOAD_DIR: process.env.VOICE_UPLOAD_DIR || './data/voice-uploads',
  MAX_AUDIO_UPLOAD_MB: Number(process.env.MAX_AUDIO_UPLOAD_MB) || 10,
  RATE_LIMIT_WINDOW_MS: Number(process.env.RATE_LIMIT_WINDOW_MS) || 60_000,
  RATE_LIMIT_MAX: Number(process.env.RATE_LIMIT_MAX) || 20,
  ADMIN_TOKEN: process.env.ADMIN_TOKEN || '',
  JWT_SECRET: process.env.JWT_SECRET || (isDevelopment ? 'dev-storytelling-jwt-secret-change-me' : ''),
  JWT_EXPIRES_IN_SEC: Number(process.env.JWT_EXPIRES_IN_SEC) || 60 * 60 * 24 * 7,
  DAILY_STORY_LIMIT: Number(process.env.DAILY_STORY_LIMIT) || 2,
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
};

if (isProduction && !env.JWT_SECRET?.trim()) {
  throw new Error('JWT_SECRET در production الزامی است.');
}

export default env;
