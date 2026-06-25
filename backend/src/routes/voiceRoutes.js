import { Router } from 'express';
import fs from 'fs';
import env from '../config/env.js';
import { userAuth } from '../middleware/userAuth.js';
import {
  generateVoicePreview,
  getContentTypeForFormat,
} from '../services/ttsService.js';
import { getAudioStoragePath } from '../services/audioStorageService.js';
import { resolveBuiltinVoice } from '../catalog/ttsVoices.js';
import { resolveElevenLabsVoice } from '../catalog/elevenLabsVoices.js';
import { resolveIviraSpeaker } from '../catalog/iviraVoices.js';
import {
  voiceProfileUpload,
  mapUploadedVoiceFiles,
  handleMulterError,
} from '../middleware/audioUpload.js';
import { deleteFileIfExists } from '../services/audioStorageService.js';
import {
  createParentVoiceProfile,
  getAvailableVoiceMode,
} from '../services/customVoiceService.js';
import {
  getVoiceProfileById,
  getVoiceProfilesBySessionId,
  deleteVoiceProfile,
  toPublicVoiceProfile,
} from '../repositories/voiceProfileRepository.js';

const router = Router();

function resolvePreviewVoice(requestedVoice) {
  if (env.TTS_PROVIDER === 'elevenlabs') {
    return resolveElevenLabsVoice(requestedVoice, env.ELEVENLABS_VOICE_ID);
  }
  if (env.TTS_PROVIDER === 'ivira') {
    return resolveIviraSpeaker(requestedVoice, env.IVIRA_SPEAKER);
  }
  return resolveBuiltinVoice(requestedVoice, env.OPENAI_TTS_VOICE);
}

router.get('/mode', (_req, res) => {
  const mode = getAvailableVoiceMode();
  return res.json({
    success: true,
    ...mode,
  });
});

router.post('/preview', userAuth, async (req, res, next) => {
  try {
    const voice = resolvePreviewVoice(req.body?.voice);
    const format = req.body?.format || env.OPENAI_TTS_FORMAT || 'mp3';
    const text = req.body?.text;
    const backgroundAmbience = req.body?.backgroundAmbience === true;
    const result = await generateVoicePreview({ voice, format, text, backgroundAmbience });

    return res.json({
      success: true,
      audio: {
        voice: result.voice,
        format: result.format,
        provider: result.provider,
        audioUrl: result.audioUrl,
        backgroundAmbienceApplied: result.backgroundAmbienceApplied === true,
      },
    });
  } catch (err) {
    return next(err);
  }
});

router.get('/preview-file/:filename', userAuth, (req, res) => {
  try {
    const audioPath = getAudioStoragePath(req.params.filename);

    if (!fs.existsSync(audioPath)) {
      return res.status(404).json({
        success: false,
        error: 'فایل پیش‌نمایش پیدا نشد.',
      });
    }

    const ext = req.params.filename.split('.').pop() || 'mp3';
    res.setHeader('Content-Type', getContentTypeForFormat(ext));
    return res.sendFile(audioPath);
  } catch (err) {
    return res.status(400).json({
      success: false,
      error: 'مسیر فایل نامعتبر است.',
    });
  }
});

router.post(
  '/profiles',
  voiceProfileUpload,
  handleMulterError,
  async (req, res, next) => {
    try {
      const sessionId = req.body.sessionId?.trim() || null;
      const parentLabel = req.body.parentLabel?.trim();

      if (!parentLabel) {
        return res.status(400).json({
          success: false,
          error: 'برچسب والد الزامی است.',
        });
      }

      const { consentAudioPath, sampleAudioPath } = mapUploadedVoiceFiles(req.files);

      if (!consentAudioPath || !sampleAudioPath) {
        return res.status(400).json({
          success: false,
          error: 'فایل‌های consentAudio و sampleAudio هر دو الزامی هستند.',
        });
      }

      const result = await createParentVoiceProfile({
        sessionId,
        parentLabel,
        consentAudioPath,
        sampleAudioPath,
      });

      return res.status(201).json({
        success: true,
        voiceProfile: {
          ...toPublicVoiceProfile(result.profile),
          customVoiceEnabled: env.CUSTOM_VOICE_ENABLED,
        },
        message: result.message,
      });
    } catch (err) {
      return next(err);
    }
  },
);

router.get('/session/:sessionId', (req, res) => {
  const sessionId = req.params.sessionId?.trim();

  if (!sessionId) {
    return res.status(400).json({
      success: false,
      error: 'شناسه نشست معتبر نیست.',
    });
  }

  const profiles = getVoiceProfilesBySessionId(sessionId).map(toPublicVoiceProfile);

  return res.json({
    success: true,
    voiceProfiles: profiles,
  });
});

router.get('/:id', (req, res) => {
  const id = Number(req.params.id);

  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({
      success: false,
      error: 'شناسه پروفایل صدا معتبر نیست.',
    });
  }

  const profile = getVoiceProfileById(id);

  if (!profile) {
    return res.status(404).json({
      success: false,
      error: 'پروفایل صدا پیدا نشد.',
    });
  }

  return res.json({
    success: true,
    voiceProfile: toPublicVoiceProfile(profile),
  });
});

router.delete('/:id', (req, res) => {
  const id = Number(req.params.id);

  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({
      success: false,
      error: 'شناسه پروفایل صدا معتبر نیست.',
    });
  }

  const profile = deleteVoiceProfile(id);

  if (!profile) {
    return res.status(404).json({
      success: false,
      error: 'پروفایل صدا پیدا نشد.',
    });
  }

  deleteFileIfExists(profile.consentAudioPath);
  deleteFileIfExists(profile.sampleAudioPath);

  return res.json({
    success: true,
    message: 'پروفایل صدا حذف شد.',
  });
});

export default router;
