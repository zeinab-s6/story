import fs from 'fs';
import path from 'path';
import { Blob } from 'node:buffer';
import env from '../config/env.js';
import { resolveElevenLabsVoice } from '../catalog/elevenLabsVoices.js';
import {
  createSafeAudioFilename,
  getAudioStoragePath,
} from './audioStorageService.js';

const ELEVENLABS_API_BASE = 'https://api.elevenlabs.io/v1';

const OUTPUT_FORMAT_MAP = {
  mp3: 'mp3_44100_128',
  wav: 'pcm_44100',
};

function wrapPcmInWav(pcmBuffer, sampleRate = 44100, numChannels = 1, bitsPerSample = 16) {
  const dataSize = pcmBuffer.length;
  const buffer = Buffer.alloc(44 + dataSize);

  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * numChannels * (bitsPerSample / 8), 28);
  buffer.writeUInt16LE(numChannels * (bitsPerSample / 8), 32);
  buffer.writeUInt16LE(bitsPerSample, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);
  pcmBuffer.copy(buffer, 44);

  return buffer;
}

function resolveOutputFormat(format) {
  const normalized = String(format || 'mp3').toLowerCase();
  if (normalized === 'wav') {
    return { apiFormat: OUTPUT_FORMAT_MAP.wav, savedFormat: 'wav' };
  }
  return { apiFormat: OUTPUT_FORMAT_MAP.mp3, savedFormat: 'mp3' };
}

async function requestElevenLabsSpeech({ voiceId, text, modelId, outputFormat }) {
  const url = new URL(`${ELEVENLABS_API_BASE}/text-to-speech/${voiceId}`);
  url.searchParams.set('output_format', outputFormat);

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'xi-api-key': env.ELEVENLABS_API_KEY,
      'Content-Type': 'application/json',
      Accept: 'audio/mpeg',
    },
    body: JSON.stringify({
      text,
      model_id: modelId,
      voice_settings: {
        stability: env.ELEVENLABS_STABILITY,
        similarity_boost: env.ELEVENLABS_SIMILARITY_BOOST,
      },
    }),
  });

  if (!response.ok) {
    let details = '';
    try {
      const errorBody = await response.json();
      details = errorBody?.detail?.message || errorBody?.detail || JSON.stringify(errorBody);
    } catch {
      details = await response.text();
    }

    const error = new Error(`ElevenLabs TTS failed (${response.status}): ${details}`);
    error.statusCode = response.status === 401 ? 500 : 502;
    throw error;
  }

  return Buffer.from(await response.arrayBuffer());
}

function saveAudioBuffer(buffer, format) {
  const filename = createSafeAudioFilename('story', format);
  const audioPath = getAudioStoragePath(filename);
  fs.writeFileSync(audioPath, buffer);
  return audioPath;
}

export async function generateStoryAudioWithElevenLabs({
  narrationText,
  voice,
  format,
  isCustomVoice = false,
}) {
  if (!env.ELEVENLABS_API_KEY?.trim()) {
    const error = new Error('کلید API ElevenLabs تنظیم نشده است.');
    error.statusCode = 500;
    throw error;
  }

  const resolvedVoice = isCustomVoice
    ? voice
    : resolveElevenLabsVoice(voice, env.ELEVENLABS_VOICE_ID);

  const { apiFormat, savedFormat } = resolveOutputFormat(format);
  const modelId = env.ELEVENLABS_MODEL_ID;

  let audioBuffer = await requestElevenLabsSpeech({
    voiceId: resolvedVoice,
    text: narrationText,
    modelId,
    outputFormat: apiFormat,
  });

  if (savedFormat === 'wav') {
    audioBuffer = wrapPcmInWav(audioBuffer);
  }

  const audioPath = saveAudioBuffer(audioBuffer, savedFormat);

  return {
    audioPath,
    model: modelId,
    voice: resolvedVoice,
    format: savedFormat,
    provider: 'elevenlabs',
    fallbackUsed: false,
  };
}

export async function createElevenLabsClonedVoice({ parentLabel, sampleAudioPath }) {
  if (!env.ELEVENLABS_API_KEY?.trim()) {
    throw new Error('کلید API ElevenLabs تنظیم نشده است.');
  }

  if (!sampleAudioPath || !fs.existsSync(sampleAudioPath)) {
    throw new Error('فایل نمونه صدا پیدا نشد.');
  }

  const safeLabel = String(parentLabel || 'parent').replace(/[^a-zA-Z0-9_-]/g, '');
  const voiceName = `parent-${safeLabel}-${Date.now()}`;
  const formData = new FormData();
  formData.append('name', voiceName);
  formData.append('description', 'Parent voice clone for storytelling app');
  const sampleBuffer = fs.readFileSync(sampleAudioPath);
  const sampleBlob = new Blob([sampleBuffer], { type: 'audio/mpeg' });
  formData.append('files', sampleBlob, path.basename(sampleAudioPath));

  const response = await fetch(`${ELEVENLABS_API_BASE}/voices/add`, {
    method: 'POST',
    headers: {
      'xi-api-key': env.ELEVENLABS_API_KEY,
    },
    body: formData,
  });

  if (!response.ok) {
    let details = '';
    try {
      const errorBody = await response.json();
      details = errorBody?.detail?.message || JSON.stringify(errorBody);
    } catch {
      details = await response.text();
    }
    throw new Error(`ElevenLabs voice clone failed: ${details}`);
  }

  const result = await response.json();
  const voiceId = result?.voice_id;

  if (!voiceId || typeof voiceId !== 'string') {
    throw new Error('شناسه صدای ElevenLabs دریافت نشد.');
  }

  return voiceId;
}

export default {
  generateStoryAudioWithElevenLabs,
  createElevenLabsClonedVoice,
};
