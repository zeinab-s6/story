import fs from 'fs';
import env from '../config/env.js';
import { resolveIviraSpeaker, speakerIdToLabel } from '../catalog/iviraVoices.js';
import {
  createSafeAudioFilename,
  getAudioStoragePath,
} from './audioStorageService.js';
import { iviraFetch } from './iviraFetch.js';

const SHORT_SPEECH_ROUTE = '/TextToSpeech/v1/speech-synthesys';
const MAX_SHORT_SPEECH_LENGTH = 1000;

function detectAudioFormat(buffer) {
  if (buffer.length >= 4 && buffer.toString('ascii', 0, 4) === 'RIFF') {
    return 'wav';
  }
  if (buffer.length >= 3 && buffer[0] === 0xff && (buffer[1] & 0xe0) === 0xe0) {
    return 'mp3';
  }
  if (buffer.length >= 3 && buffer.toString('ascii', 0, 3) === 'ID3') {
    return 'mp3';
  }
  return 'wav';
}

function chunkText(text, maxLen = MAX_SHORT_SPEECH_LENGTH) {
  const normalized = String(text || '').trim();
  if (!normalized) {
    return [];
  }
  if (normalized.length <= maxLen) {
    return [normalized];
  }

  const chunks = [];
  let current = '';
  const parts = normalized.split(/(?<=[.!?؟\n])\s+/u);

  for (const part of parts) {
    const candidate = current ? `${current} ${part}` : part;

    if (candidate.length <= maxLen) {
      current = candidate;
      continue;
    }

    if (current) {
      chunks.push(current);
      current = '';
    }

    if (part.length <= maxLen) {
      current = part;
      continue;
    }

    for (let index = 0; index < part.length; index += maxLen) {
      chunks.push(part.slice(index, index + maxLen));
    }
  }

  if (current) {
    chunks.push(current);
  }

  return chunks;
}

function concatenateAudioBuffers(buffers) {
  if (buffers.length === 0) {
    return Buffer.alloc(0);
  }
  if (buffers.length === 1) {
    return buffers[0];
  }

  const format = detectAudioFormat(buffers[0]);
  if (format === 'wav') {
    const parts = [buffers[0]];
    for (let index = 1; index < buffers.length; index += 1) {
      const chunk = buffers[index];
      parts.push(chunk.length > 44 ? chunk.subarray(44) : chunk);
    }

    const combined = Buffer.concat(parts);
    combined.writeUInt32LE(combined.length - 8, 4);
    combined.writeUInt32LE(combined.length - 44, 40);
    return combined;
  }

  return Buffer.concat(buffers);
}

function normalizeSpeed(speed) {
  const parsed = Number(speed);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 1;
  }
  return Math.min(3, Math.max(0.5, parsed));
}

async function synthesizeShortSpeech(text, speaker, speed = 1) {
  const response = await iviraFetch(`${env.IVIRA_BASE_URL}${SHORT_SPEECH_ROUTE}`, {
    method: 'POST',
    headers: {
      'gateway-token': env.IVIRA_TOKEN,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      data: text,
      filePath: false,
      base64: '1',
      checksum: '0',
      timestamp: '0',
      speaker: String(speaker),
      speed: String(speed),
    }),
    signal: AbortSignal.timeout(env.IVIRA_TIMEOUT_MS),
  });

  if (!response.ok) {
    let details = '';
    try {
      details = await response.text();
    } catch {
      details = '';
    }

    const error = new Error(`خطا از سرویس آواشو (${response.status}). توکن یا تنظیمات ویرا را بررسی کنید.`);
    error.statusCode = response.status === 401 ? 500 : 502;
    error.code = 'IVIRA_HTTP_ERROR';
    if (!env.isProduction) {
      error.details = details.slice(0, 500);
    }
    throw error;
  }

  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('text/html')) {
    const error = new Error('پاسخ نامعتبر از درگاه ویرا دریافت شد. IVIRA_BASE_URL را بررسی کنید.');
    error.statusCode = 502;
    error.code = 'IVIRA_INVALID_RESPONSE';
    throw error;
  }

  let payload;
  try {
    payload = await response.json();
  } catch (err) {
    const error = new Error('پاسخ TTS ویرا قابل خواندن نبود.');
    error.statusCode = 502;
    error.code = 'IVIRA_INVALID_JSON';
    if (!env.isProduction) {
      error.details = err.message;
    }
    throw error;
  }

  const base64 = payload?.data?.data?.base64;
  if (!base64 || typeof base64 !== 'string') {
    const error = new Error('پاسخ TTS ویرا فاقد داده صوتی بود.');
    error.statusCode = 502;
    throw error;
  }

  return Buffer.from(base64, 'base64');
}

async function synthesizeSpeech(text, speaker, speed = 1) {
  const chunks = chunkText(text);
  if (chunks.length === 0) {
    const error = new Error('متن خالی برای تبدیل به صدا ارسال شد.');
    error.statusCode = 400;
    throw error;
  }

  const buffers = [];
  for (const chunk of chunks) {
    buffers.push(await synthesizeShortSpeech(chunk, speaker, speed));
  }

  return concatenateAudioBuffers(buffers);
}

function saveAudioBuffer(buffer, preferredFormat) {
  const detectedFormat = detectAudioFormat(buffer);
  const savedFormat = preferredFormat === 'mp3' || preferredFormat === 'wav'
    ? preferredFormat
    : detectedFormat;
  const filename = createSafeAudioFilename('story', savedFormat);
  const audioPath = getAudioStoragePath(filename);
  fs.writeFileSync(audioPath, buffer);
  return { audioPath, format: savedFormat };
}

export async function generateStoryAudioWithIvira({
  narrationText,
  voice,
  format,
  speed,
}) {
  if (!env.IVIRA_TOKEN?.trim()) {
    const error = new Error('توکن TTS ویرا تنظیم نشده است.');
    error.statusCode = 500;
    throw error;
  }

  const speaker = resolveIviraSpeaker(voice, env.IVIRA_SPEAKER);
  const speedValue = normalizeSpeed(speed);
  const audioBuffer = await synthesizeSpeech(narrationText, speaker, speedValue);
  const { audioPath, format: savedFormat } = saveAudioBuffer(audioBuffer, format);

  return {
    audioPath,
    model: 'avasho',
    voice: speakerIdToLabel(speaker),
    format: savedFormat,
    provider: 'ivira',
    fallbackUsed: false,
  };
}

export default {
  generateStoryAudioWithIvira,
};
