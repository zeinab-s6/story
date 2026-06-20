import fs from 'fs';
import path from 'path';
import env from '../config/env.js';
import { resolveBuiltinVoice } from '../catalog/ttsVoices.js';
import { resolveElevenLabsVoice, listElevenLabsPresetVoices } from '../catalog/elevenLabsVoices.js';
import { resolveIviraSpeaker, listIviraPresetVoices, speakerIdToLabel } from '../catalog/iviraVoices.js';
import {
  createVoiceProfile,
  updateVoiceProfileStatus,
} from '../repositories/voiceProfileRepository.js';
import createOpenAIClient from './openaiClient.js';
import { createElevenLabsClonedVoice } from './elevenlabsService.js';

const CUSTOM_VOICE_UNAVAILABLE_MESSAGE =
  'صدای اختصاصی برای این اکانت در دسترس نیست. قصه با صدای آماده خوانده می‌شود.';

const LOCAL_SAMPLE_SAVED_MESSAGE =
  'نمونه صدا ذخیره شد، اما ساخت صدای اختصاصی برای این اکانت فعال نیست. قصه با صدای آماده خوانده می‌شود.';

function getCustomVoiceCreateFn(client) {
  return (
    client?.audio?.voices?.create ||
    client?.beta?.audio?.voices?.create ||
    client?.beta?.voices?.create ||
    null
  );
}

function buildVoiceTagline() {
  const provider = env.TTS_PROVIDER;

  if (provider === 'ivira') {
    return '۶ گوینده فارسی آواشو (ویرا) — پیش‌نمایش و روایت قصه.';
  }

  if (provider === 'elevenlabs') {
    return 'صدای فارسی ElevenLabs — پیش‌نمایش و روایت قصه.';
  }

  if (provider === 'mock') {
    return 'حالت آزمایشی — صدای نمونه برای پیش‌نمایش و روایت قصه.';
  }

  const baseUrl = (env.OPENAI_TTS_BASE_URL || env.OPENAI_BASE_URL || '').trim();
  const model = (env.OPENAI_TTS_MODEL || '').trim();

  if (/gapgpt/i.test(baseUrl)) {
    if (/gemini.*tts/i.test(model)) {
      return 'صدای فارسی از GapGPT (Gemini TTS) — پیش‌نمایش و روایت قصه.';
    }
    return 'صدای فارسی از GapGPT — پیش‌نمایش و روایت قصه.';
  }

  if (/openai\.com/i.test(baseUrl) || !baseUrl) {
    return 'صدای فارسی OpenAI TTS — پیش‌نمایش و روایت قصه.';
  }

  return 'پیش‌نمایش و روایت قصه با صدای سرور.';
}

export function getAvailableVoiceMode() {
  const isElevenLabs = env.TTS_PROVIDER === 'elevenlabs';
  const isIvira = env.TTS_PROVIDER === 'ivira';

  return {
    ttsProvider: env.TTS_PROVIDER,
    customVoiceEnabled: env.CUSTOM_VOICE_ENABLED,
    defaultVoice: isElevenLabs
      ? env.ELEVENLABS_VOICE_ID
      : isIvira
        ? speakerIdToLabel(env.IVIRA_SPEAKER)
        : env.OPENAI_TTS_VOICE,
    ttsModel: isElevenLabs
      ? env.ELEVENLABS_MODEL_ID
      : isIvira
        ? 'avasho'
        : env.OPENAI_TTS_MODEL,
    presetVoices: isElevenLabs
      ? listElevenLabsPresetVoices()
      : isIvira
        ? listIviraPresetVoices()
        : undefined,
    customVoiceAvailable: env.CUSTOM_VOICE_ENABLED && ['openai', 'elevenlabs'].includes(env.TTS_PROVIDER),
    fallbackBehavior: isElevenLabs
      ? 'If custom voice is unavailable, built-in ElevenLabs voices will be used.'
      : isIvira
        ? 'Persian voices from Ivira Avasho are used for narration.'
        : 'If custom voice is unavailable, built-in OpenAI voices will be used.',
    storyProvider: env.STORY_PROVIDER,
    openaiBaseUrl: env.OPENAI_BASE_URL || null,
    voiceTagline: buildVoiceTagline(),
  };
}

async function tryCreateOpenAICustomVoice({ parentLabel, sampleAudioPath }) {
  if (!env.OPENAI_API_KEY?.trim()) {
    throw new Error('کلید API اوپن‌ای‌آی تنظیم نشده است.');
  }

  if (!sampleAudioPath || !fs.existsSync(sampleAudioPath)) {
    throw new Error('فایل نمونه صدا پیدا نشد.');
  }

  const client = createOpenAIClient();
  const createVoice = getCustomVoiceCreateFn(client);

  if (typeof createVoice !== 'function') {
    throw new Error('Custom Voice API برای این اکانت فعال نیست.');
  }

  const safeLabel = String(parentLabel || 'parent').replace(/[^a-zA-Z0-9_-]/g, '');
  const voiceName = `parent-${safeLabel}-${Date.now()}`;

  let createdVoice;
  try {
    createdVoice = await createVoice.call(
      client.audio?.voices || client.beta?.audio?.voices || client.beta?.voices,
      {
        name: voiceName,
        file: fs.createReadStream(sampleAudioPath),
        filename: path.basename(sampleAudioPath),
      },
    );
  } catch {
    throw new Error('Custom Voice API برای این اکانت فعال نیست.');
  }

  const voiceId = createdVoice?.id || createdVoice?.voice_id || createdVoice?.voice;
  if (!voiceId || typeof voiceId !== 'string') {
    throw new Error('شناسه صدای اختصاصی دریافت نشد.');
  }

  return voiceId;
}

async function tryCreateCustomVoice({ parentLabel, sampleAudioPath }) {
  if (env.TTS_PROVIDER === 'elevenlabs') {
    return createElevenLabsClonedVoice({ parentLabel, sampleAudioPath });
  }

  return tryCreateOpenAICustomVoice({ parentLabel, sampleAudioPath });
}

export async function createParentVoiceProfile({
  sessionId,
  parentLabel,
  consentAudioPath,
  sampleAudioPath,
}) {
  if (!env.CUSTOM_VOICE_ENABLED) {
    const profile = createVoiceProfile({
      sessionId,
      parentLabel,
      provider: env.TTS_PROVIDER,
      consentAudioPath,
      sampleAudioPath,
      status: 'local_sample_saved',
    });

    return {
      profile,
      message: LOCAL_SAMPLE_SAVED_MESSAGE,
      customVoiceEnabled: false,
    };
  }

  const profile = createVoiceProfile({
    sessionId,
    parentLabel,
    provider: env.TTS_PROVIDER,
    consentAudioPath,
    sampleAudioPath,
    status: 'local_sample_saved',
  });

  try {
    const externalVoiceId = await tryCreateCustomVoice({
      parentLabel,
      sampleAudioPath,
    });

    const updated = updateVoiceProfileStatus(
      profile.id,
      'custom_voice_created',
      externalVoiceId,
    );

    return {
      profile: updated,
      message: 'صدای اختصاصی والد با موفقیت ثبت شد.',
      customVoiceEnabled: true,
    };
  } catch {
    const unavailable = updateVoiceProfileStatus(
      profile.id,
      'custom_voice_unavailable',
      null,
    );

    return {
      profile: unavailable,
      message: CUSTOM_VOICE_UNAVAILABLE_MESSAGE,
      customVoiceEnabled: false,
    };
  }
}

export function resolveVoiceForNarration({ requestedVoice, voiceProfile }) {
  const isElevenLabs = env.TTS_PROVIDER === 'elevenlabs';
  const isIvira = env.TTS_PROVIDER === 'ivira';
  const defaultVoice = isElevenLabs
    ? resolveElevenLabsVoice(null, env.ELEVENLABS_VOICE_ID)
    : isIvira
      ? resolveIviraSpeaker(null, env.IVIRA_SPEAKER)
      : resolveBuiltinVoice(env.OPENAI_TTS_VOICE, 'alloy');
  let fallbackUsed = false;
  const builtinVoice = isElevenLabs
    ? resolveElevenLabsVoice(requestedVoice, defaultVoice)
    : isIvira
      ? resolveIviraSpeaker(requestedVoice, defaultVoice)
      : resolveBuiltinVoice(requestedVoice, defaultVoice);

  if (
    voiceProfile &&
    env.CUSTOM_VOICE_ENABLED &&
    voiceProfile.openaiVoiceId &&
    voiceProfile.status === 'custom_voice_created'
  ) {
    return {
      voice: voiceProfile.openaiVoiceId,
      builtinFallbackVoice: builtinVoice,
      fallbackUsed: false,
      voiceType: 'custom',
    };
  }

  if (voiceProfile) {
    fallbackUsed = true;
  }

  return {
    voice: builtinVoice,
    builtinFallbackVoice: builtinVoice,
    fallbackUsed,
    voiceType: 'builtin',
  };
}

export default {
  createParentVoiceProfile,
  resolveVoiceForNarration,
  getAvailableVoiceMode,
};
