import path from 'path';
import fs from 'fs';
import createOpenAIClient from './openaiClient.js';
import env from '../config/env.js';
import { resolveBuiltinVoice } from '../catalog/ttsVoices.js';
import {
  createSafeAudioFilename,
  getAudioStoragePath,
  deleteFileIfExists,
} from './audioStorageService.js';
import { resolveVoiceForNarration } from './customVoiceService.js';
import { generateStoryAudioWithElevenLabs } from './elevenlabsService.js';
import { generateStoryAudioWithIvira } from './iviraService.js';
import {
  isGeminiTtsModel,
  synthesizeWithGapGptGeminiTts,
} from './gapgptGeminiTtsService.js';
import { mixNarrationWithBackgroundAmbience } from './backgroundAmbienceService.js';

const SUPPORTED_FORMATS = ['mp3', 'wav', 'opus', 'aac', 'flac'];

function buildNarrationText(story) {
  return typeof story?.storyText === 'string' ? story.storyText.trim() : '';
}

function extractStoryTextForNarration(story, combinedText) {
  const parts = String(combinedText || '')
    .split(/\n\n+/)
    .map((part) => part.trim())
    .filter(Boolean);

  const nonStoryParts = new Set(
    [story?.parentIntro]
      .filter((part) => typeof part === 'string' && part.trim())
      .map((part) => part.trim()),
  );

  const storyParts = parts.filter((part) => !nonStoryParts.has(part));
  if (storyParts.length) {
    return storyParts.join('\n\n');
  }

  return buildNarrationText(story);
}

function normalizeFormat(format) {
  const normalized = String(format || env.OPENAI_TTS_FORMAT || 'mp3').toLowerCase();
  return SUPPORTED_FORMATS.includes(normalized) ? normalized : 'mp3';
}

function createSilentWavBuffer(durationMs = 500) {
  const sampleRate = 22050;
  const numChannels = 1;
  const bitsPerSample = 16;
  const numSamples = Math.floor((sampleRate * durationMs) / 1000);
  const dataSize = numSamples * numChannels * (bitsPerSample / 8);
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

  return buffer;
}

async function saveOpenAIResponseToFile(response, format) {
  const filename = createSafeAudioFilename('story', format);
  const audioPath = getAudioStoragePath(filename);
  const buffer = Buffer.from(await response.arrayBuffer());
  if (!buffer.length || buffer.length < 64) {
    const error = new Error('پاسخ OpenAI TTS فاقد داده صوتی معتبر بود.');
    error.statusCode = 502;
    error.code = 'OPENAI_TTS_EMPTY_AUDIO';
    throw error;
  }
  fs.writeFileSync(audioPath, buffer);
  return audioPath;
}

async function saveAudioBufferToFile(audioBuffer, format) {
  const filename = createSafeAudioFilename('story', format);
  const audioPath = getAudioStoragePath(filename);
  fs.writeFileSync(audioPath, audioBuffer);
  return audioPath;
}

export async function generateStoryAudioWithGapGptGemini({
  narrationText,
  voice,
}) {
  const result = await synthesizeWithGapGptGeminiTts({ narrationText, voice });
  const audioPath = await saveAudioBufferToFile(result.audioBuffer, result.format);

  return {
    audioPath,
    model: result.model,
    voice: result.voice,
    format: result.format,
    provider: result.provider,
    fallbackUsed: false,
  };
}

export async function generateStoryAudioWithMock({ story, format }) {
  const normalizedFormat = normalizeFormat(format);
  const filename = createSafeAudioFilename('story-mock', normalizedFormat);
  const audioPath = getAudioStoragePath(filename);

  if (normalizedFormat === 'wav') {
    fs.writeFileSync(audioPath, createSilentWavBuffer());
  } else {
    fs.writeFileSync(audioPath, Buffer.from('MOCK_AUDIO_PLACEHOLDER'));
  }

  return {
    audioPath,
    model: 'mock-tts',
    voice: 'mock',
    format: normalizedFormat,
    provider: 'mock',
    fallbackUsed: false,
  };
}

export async function generateStoryAudioWithOpenAI({
  narrationText,
  voice,
  format,
  isCustomVoice = false,
  speed,
}) {
  if (!env.OPENAI_API_KEY?.trim() && !env.OPENAI_TTS_API_KEY?.trim()) {
    const error = new Error('کلید API اوپن‌ای‌آی تنظیم نشده است.');
    error.statusCode = 500;
    throw error;
  }

  const transcript = String(narrationText || '').trim();
  if (!transcript) {
    const error = new Error('متن روایت برای تولید صدا خالی است.');
    error.statusCode = 400;
    throw error;
  }

  const normalizedFormat = normalizeFormat(format);
  const resolvedVoice = isCustomVoice
    ? voice
    : resolveBuiltinVoice(voice, env.OPENAI_TTS_VOICE);

  // Only Gemini GapGPT chat-audio models use the alternate path.
  // Standard OpenAI TTS always goes through POST /v1/audio/speech.
  if (isGeminiTtsModel(env.OPENAI_TTS_MODEL)) {
    return generateStoryAudioWithGapGptGemini({
      narrationText: transcript,
      voice: resolvedVoice,
    });
  }

  const client = createOpenAIClient({ forTts: true });

  const modelCandidates = [
    env.OPENAI_TTS_MODEL,
    'gpt-4o-mini-tts',
    'tts-1',
    'tts-1-hd',
  ].filter((model, index, list) => model && list.indexOf(model) === index && !isGeminiTtsModel(model));

  let lastError;
  const parsedSpeed = Number(speed);
  const speechSpeed = Number.isFinite(parsedSpeed) && parsedSpeed > 0
    ? Math.min(4, Math.max(0.25, parsedSpeed))
    : undefined;

  for (const model of modelCandidates) {
    try {
      const payload = {
        model,
        voice: resolvedVoice,
        input: transcript,
        response_format: normalizedFormat,
      };
      if (speechSpeed != null) {
        payload.speed = speechSpeed;
      }

      const response = await client.audio.speech.create(payload);
      const audioPath = await saveOpenAIResponseToFile(response, normalizedFormat);

      return {
        audioPath,
        model,
        voice: resolvedVoice,
        format: normalizedFormat,
        provider: 'openai',
        fallbackUsed: model !== env.OPENAI_TTS_MODEL,
      };
    } catch (err) {
      lastError = err;
      if (env.isDevelopment || env.LOG_LEVEL === 'debug') {
        console.warn('[openai-tts]', model, err?.status || err?.code || '', err?.message || err);
      }
    }
  }

  const isRateLimit = lastError?.status === 429 || lastError?.code === 'api_limit';
  const providerMessage = lastError?.error?.message || lastError?.message;
  const error = new Error(
    isRateLimit
      ? 'سقف درخواست TTS پر شده. کمی بعد دوباره تلاش کنید.'
      : (providerMessage
        ? `خطا در تولید صدا با OpenAI TTS: ${providerMessage}`
        : 'خطا در تولید صدا با OpenAI TTS. لطفاً دوباره تلاش کنید.'),
  );
  error.statusCode = isRateLimit ? 429 : (lastError?.statusCode || lastError?.status || 502);
  error.code = lastError?.code || 'OPENAI_TTS_FAILED';
  if (!env.isProduction || env.isDevelopment) {
    error.details = providerMessage || lastError?.message;
  }
  throw error;
}

const PREVIEW_NARRATION_TEXT = 'سلام کوچولو. وقت قصه است. با هم یک داستان آرام می‌سازیم.';

function canFallbackToOpenAI() {
  return env.IVIRA_FALLBACK_OPENAI
    && (env.OPENAI_TTS_API_KEY?.trim() || env.OPENAI_API_KEY?.trim());
}

function isIviraConnectivityError(err) {
  return err?.code === 'IVIRA_CONNECT_FAILED' || err?.code === 'IVIRA_TIMEOUT';
}

async function applyBackgroundAmbienceIfRequested(result, backgroundAmbience) {
  if (!backgroundAmbience || !result?.audioPath) {
    return result;
  }

  try {
    const mixedPath = await mixNarrationWithBackgroundAmbience({
      narrationPath: result.audioPath,
      format: result.format,
    });
    deleteFileIfExists(result.audioPath);
    return {
      ...result,
      audioPath: mixedPath,
      backgroundAmbienceApplied: true,
    };
  } catch (err) {
    if (env.isDevelopment) {
      console.warn('[backgroundAmbience]', err.message);
    }
    return {
      ...result,
      backgroundAmbienceRequested: true,
      backgroundAmbienceApplied: false,
    };
  }
}

async function generateWithIviraOrFallback({
  narrationText,
  voice,
  format,
  openaiVoice,
  speed,
}) {
  let iviraErr;
  try {
    return await generateStoryAudioWithIvira({
      narrationText,
      voice,
      format,
      speed,
    });
  } catch (err) {
    iviraErr = err;
    if (!canFallbackToOpenAI() || !isIviraConnectivityError(err)) {
      throw err;
    }
  }

  try {
    const fallbackResult = await generateStoryAudioWithOpenAI({
      narrationText,
      voice: openaiVoice || env.OPENAI_TTS_VOICE,
      format,
      speed,
    });

    return {
      ...fallbackResult,
      fallbackUsed: true,
    };
  } catch {
    const error = new Error(iviraErr.message || 'خطا در تولید صدا با ویرا (آواشو).');
    error.statusCode = iviraErr.statusCode || 502;
    error.code = iviraErr.code;
    if (!env.isProduction) {
      error.details = iviraErr.details || iviraErr.message;
    }
    throw error;
  }
}

export async function generateVoicePreview({ voice, format = 'mp3', text, backgroundAmbience = false, speed }) {
  const normalizedFormat = normalizeFormat(format);
  const narrationText = typeof text === 'string' && text.trim()
    ? text.trim()
    : PREVIEW_NARRATION_TEXT;

  if (env.TTS_PROVIDER === 'mock') {
    const result = await generateStoryAudioWithMock({ story: {}, format: normalizedFormat });
    const mixed = await applyBackgroundAmbienceIfRequested(result, backgroundAmbience);
    const filename = path.basename(mixed.audioPath);
    return {
      ...mixed,
      audioUrl: `/api/voices/preview-file/${filename}`,
    };
  }

  if (env.TTS_PROVIDER === 'ivira') {
    try {
      const iviraResult = await generateWithIviraOrFallback({
        narrationText,
        voice,
        format: normalizedFormat,
        speed,
      });
      const mixed = await applyBackgroundAmbienceIfRequested(iviraResult, backgroundAmbience);
      const filename = path.basename(mixed.audioPath);

      return {
        ...mixed,
        audioUrl: `/api/voices/preview-file/${filename}`,
      };
    } catch (err) {
      const error = new Error(err.message || 'خطا در تولید پیش‌نمایش صدا با ویرا (آواشو).');
      error.statusCode = err.statusCode || 502;
      error.code = err.code;
      if (!env.isProduction) {
        error.details = err.details || err.message;
      }
      throw error;
    }
  }

  if (env.TTS_PROVIDER === 'elevenlabs') {
    const elevenLabsResult = await generateStoryAudioWithElevenLabs({
      narrationText,
      voice,
      format: normalizedFormat,
      isCustomVoice: false,
    });
    const mixed = await applyBackgroundAmbienceIfRequested(elevenLabsResult, backgroundAmbience);
    const filename = path.basename(mixed.audioPath);
    return {
      ...mixed,
      audioUrl: `/api/voices/preview-file/${filename}`,
    };
  }

  // TTS_PROVIDER=openai → OpenAI-compatible /v1/audio/speech
  const openaiResult = await generateStoryAudioWithOpenAI({
    narrationText,
    voice,
    format: normalizedFormat,
    speed,
  });
  const mixed = await applyBackgroundAmbienceIfRequested(openaiResult, backgroundAmbience);
  const filename = path.basename(mixed.audioPath);

  return {
    ...mixed,
    audioUrl: `/api/voices/preview-file/${filename}`,
  };
}

export async function generateStoryAudio({
  story,
  requestedVoice,
  voiceProfile,
  format,
  narrationTextOverride,
  backgroundAmbience = false,
  speed,
}) {
  const narrationText = typeof narrationTextOverride === 'string' && narrationTextOverride.trim()
    ? extractStoryTextForNarration(story, narrationTextOverride.trim())
    : buildNarrationText(story);
  const normalizedFormat = normalizeFormat(format);
  const { voice, builtinFallbackVoice, fallbackUsed, voiceType } = resolveVoiceForNarration({
    requestedVoice,
    voiceProfile,
  });

  if (env.TTS_PROVIDER === 'mock') {
    const result = await generateStoryAudioWithMock({
      story,
      format: normalizedFormat,
    });
    return applyBackgroundAmbienceIfRequested({ ...result, fallbackUsed }, backgroundAmbience);
  }

  if (env.TTS_PROVIDER === 'ivira') {
    try {
      const iviraResult = await generateWithIviraOrFallback({
        narrationText,
        voice,
        format: normalizedFormat,
        speed,
      });

      return applyBackgroundAmbienceIfRequested({
        ...iviraResult,
        fallbackUsed: fallbackUsed || iviraResult.fallbackUsed,
      }, backgroundAmbience);
    } catch (err) {
      const error = new Error(err.message || 'خطا در تولید صدا با ویرا (آواشو). لطفاً دوباره تلاش کنید.');
      error.statusCode = err.statusCode || 502;
      error.code = err.code;
      if (!env.isProduction) {
        error.details = err.details || err.message;
      }
      throw error;
    }
  }

  if (env.TTS_PROVIDER === 'elevenlabs') {
    try {
      const elevenLabsResult = await generateStoryAudioWithElevenLabs({
        narrationText,
        voice,
        format: normalizedFormat,
        isCustomVoice: voiceType === 'custom',
      });

      return applyBackgroundAmbienceIfRequested({
        ...elevenLabsResult,
        fallbackUsed: fallbackUsed || elevenLabsResult.fallbackUsed,
      }, backgroundAmbience);
    } catch (err) {
      if (voiceType !== 'custom') {
        const error = new Error('خطا در تولید صدا با ElevenLabs. لطفاً دوباره تلاش کنید.');
        error.statusCode = 502;
        if (!env.isProduction) {
          error.details = err.message;
        }
        throw error;
      }

      try {
        const fallbackResult = await generateStoryAudioWithElevenLabs({
          narrationText,
          voice: builtinFallbackVoice,
          format: normalizedFormat,
          isCustomVoice: false,
        });

        return applyBackgroundAmbienceIfRequested({
          ...fallbackResult,
          fallbackUsed: true,
        }, backgroundAmbience);
      } catch (fallbackErr) {
        const error = new Error('خطا در تولید صدا با ElevenLabs. لطفاً دوباره تلاش کنید.');
        error.statusCode = 502;
        if (!env.isProduction) {
          error.details = fallbackErr.message;
        }
        throw error;
      }
    }
  }

  try {
    const openaiResult = await generateStoryAudioWithOpenAI({
      narrationText,
      voice,
      format: normalizedFormat,
      isCustomVoice: voiceType === 'custom',
      speed,
    });

    return applyBackgroundAmbienceIfRequested({
      ...openaiResult,
      fallbackUsed: fallbackUsed || openaiResult.fallbackUsed,
    }, backgroundAmbience);
  } catch (err) {
    if (voiceType !== 'custom') {
      const error = new Error('خطا در تولید صدا با OpenAI TTS. لطفاً دوباره تلاش کنید.');
      error.statusCode = 502;
      if (!env.isProduction) {
        error.details = err.message;
      }
      throw error;
    }

    try {
      const fallbackResult = await generateStoryAudioWithOpenAI({
        narrationText,
        voice: builtinFallbackVoice,
        format: normalizedFormat,
        isCustomVoice: false,
        speed,
      });

      return applyBackgroundAmbienceIfRequested({
        ...fallbackResult,
        fallbackUsed: true,
      }, backgroundAmbience);
    } catch (fallbackErr) {
      const error = new Error('خطا در تولید صدا با OpenAI TTS. لطفاً دوباره تلاش کنید.');
      error.statusCode = 502;
      if (!env.isProduction) {
        error.details = fallbackErr.message;
      }
      throw error;
    }
  }
}

export function getContentTypeForFormat(format) {
  const map = {
    mp3: 'audio/mpeg',
    wav: 'audio/wav',
    opus: 'audio/opus',
    aac: 'audio/aac',
    flac: 'audio/flac',
  };
  return map[normalizeFormat(format)] || 'application/octet-stream';
}

export default {
  generateStoryAudio,
  generateVoicePreview,
  generateStoryAudioWithMock,
  generateStoryAudioWithOpenAI,
  generateStoryAudioWithElevenLabs,
  generateStoryAudioWithIvira,
  getContentTypeForFormat,
  buildNarrationText,
};
