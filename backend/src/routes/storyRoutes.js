import { Router } from 'express';
import fs from 'fs';
import { STORY_GOALS } from '../catalog/storyGoals.js';
import { validateStoryInput } from '../validators/storyInputValidator.js';
import { validateFeedbackInput } from '../validators/feedbackValidator.js';
import { createStory } from '../agents/storyAgent.js';
import {
  getStoryById,
  deleteStoryById,
  getStoriesBySessionId,
} from '../repositories/storyRepository.js';
import { saveFeedback } from '../repositories/feedbackRepository.js';
import {
  saveStoryAudio,
  getStoryAudioByStoryId,
  getStoryAudioByStoryAndId,
  toPublicStoryAudio,
} from '../repositories/storyAudioRepository.js';
import { getVoiceProfileById } from '../repositories/voiceProfileRepository.js';
import { generateStoryAudio, getContentTypeForFormat } from '../services/ttsService.js';
import { isValidBuiltinVoice } from '../catalog/ttsVoices.js';
import { isValidElevenLabsVoice } from '../catalog/elevenLabsVoices.js';
import { isValidIviraSpeaker } from '../catalog/iviraVoices.js';
import env from '../config/env.js';

function isValidRequestedVoice(voice) {
  if (voice === undefined || voice === null) {
    return true;
  }
  if (env.TTS_PROVIDER === 'elevenlabs') {
    return isValidElevenLabsVoice(voice);
  }
  if (env.TTS_PROVIDER === 'ivira') {
    return isValidIviraSpeaker(voice);
  }
  return isValidBuiltinVoice(voice);
}

const router = Router();

router.get('/goals', (_req, res) => {
  const goals = Object.values(STORY_GOALS).map((g) => ({
    key: g.key,
    labelFa: g.labelFa,
    labelEn: g.labelEn,
  }));

  res.json({ success: true, goals });
});

router.post('/generate', async (req, res, next) => {
  const validation = validateStoryInput(req.body);

  if (!validation.valid) {
    return res.status(400).json({
      success: false,
      error: validation.errors[0],
      ...(env.isDevelopment && { details: validation.errors.join(' | ') }),
    });
  }

  try {
    const result = await createStory(validation.data);

    if (!result.success) {
      return res.status(422).json(result);
    }

    return res.status(201).json(result);
  } catch (err) {
    return next(err);
  }
});

router.get('/session/:sessionId', (req, res) => {
  const sessionId = req.params.sessionId?.trim();

  if (!sessionId || sessionId.length > 120) {
    return res.status(400).json({
      success: false,
      error: 'شناسه نشست معتبر نیست.',
    });
  }

  const limit = Math.min(Number(req.query.limit) || 20, 50);
  const stories = getStoriesBySessionId(sessionId, limit);

  return res.json({ success: true, stories });
});

router.post('/:id/audio', async (req, res, next) => {
  const storyId = Number(req.params.id);

  if (!Number.isInteger(storyId) || storyId <= 0) {
    return res.status(400).json({
      success: false,
      error: 'شناسه قصه معتبر نیست.',
    });
  }

  const storyRecord = getStoryById(storyId);
  if (!storyRecord) {
    return res.status(404).json({
      success: false,
      error: 'قصه‌ای با این شناسه پیدا نشد.',
    });
  }

  const { voiceProfileId, voice, format, narrationText, backgroundAmbience } = req.body ?? {};
  let voiceProfile = null;

  if (voiceProfileId !== undefined && voiceProfileId !== null) {
    const profileId = Number(voiceProfileId);
    if (!Number.isInteger(profileId) || profileId <= 0) {
      return res.status(400).json({
        success: false,
        error: 'شناسه پروفایل صدا معتبر نیست.',
      });
    }

    voiceProfile = getVoiceProfileById(profileId);
    if (!voiceProfile) {
      return res.status(404).json({
        success: false,
        error: 'پروفایل صدا پیدا نشد.',
      });
    }
  }

  if (voice !== undefined && voice !== null && !isValidRequestedVoice(voice)) {
    return res.status(400).json({
      success: false,
      error: 'صدای درخواستی معتبر نیست.',
    });
  }

  try {
    const audioResult = await generateStoryAudio({
      story: storyRecord.story,
      requestedVoice: voice,
      voiceProfile,
      format: format || env.OPENAI_TTS_FORMAT,
      narrationTextOverride: narrationText,
      backgroundAmbience: backgroundAmbience === true,
    });

    const savedAudio = saveStoryAudio({
      storyId,
      voiceProfileId: voiceProfile?.id ?? null,
      provider: audioResult.provider,
      model: audioResult.model,
      voice: audioResult.voice,
      format: audioResult.format,
      audioPath: audioResult.audioPath,
      status: 'ready',
      fallbackUsed: audioResult.fallbackUsed,
    });

    return res.status(201).json({
      success: true,
      audio: {
        ...toPublicStoryAudio(savedAudio, storyId),
        backgroundAmbienceApplied: audioResult.backgroundAmbienceApplied === true,
      },
    });
  } catch (err) {
    return next(err);
  }
});

router.get('/:id/audio', (req, res) => {
  const storyId = Number(req.params.id);

  if (!Number.isInteger(storyId) || storyId <= 0) {
    return res.status(400).json({
      success: false,
      error: 'شناسه قصه معتبر نیست.',
    });
  }

  const storyRecord = getStoryById(storyId);
  if (!storyRecord) {
    return res.status(404).json({
      success: false,
      error: 'قصه‌ای با این شناسه پیدا نشد.',
    });
  }

  const audioList = getStoryAudioByStoryId(storyId).map((audio) =>
    toPublicStoryAudio(audio, storyId),
  );

  return res.json({
    success: true,
    audio: audioList,
  });
});

router.get('/:storyId/audio/:audioId', (req, res) => {
  const storyId = Number(req.params.storyId);
  const audioId = Number(req.params.audioId);

  if (!Number.isInteger(storyId) || storyId <= 0 || !Number.isInteger(audioId) || audioId <= 0) {
    return res.status(400).json({
      success: false,
      error: 'شناسه قصه یا صدا معتبر نیست.',
    });
  }

  const audio = getStoryAudioByStoryAndId(storyId, audioId);
  if (!audio) {
    return res.status(404).json({
      success: false,
      error: 'فایل صوتی پیدا نشد.',
    });
  }

  if (!fs.existsSync(audio.audioPath)) {
    return res.status(404).json({
      success: false,
      error: 'فایل صوتی در دسترس نیست.',
    });
  }

  const ext = audio.format || 'mp3';
  const downloadName = `lalaBye-story-${storyId}.${ext}`;
  res.setHeader('Content-Type', getContentTypeForFormat(audio.format));
  if (req.query.download === '1' || req.query.download === 'true') {
    res.setHeader('Content-Disposition', `attachment; filename="${downloadName}"`);
  }
  return res.sendFile(audio.audioPath);
});

router.get('/:id', (req, res) => {
  const id = Number(req.params.id);

  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({
      success: false,
      error: 'شناسه قصه معتبر نیست.',
    });
  }

  const story = getStoryById(id);

  if (!story) {
    return res.status(404).json({
      success: false,
      error: 'قصه‌ای با این شناسه پیدا نشد.',
    });
  }

  return res.json({ success: true, data: story });
});

router.delete('/:id', (req, res) => {
  const id = Number(req.params.id);

  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({
      success: false,
      error: 'شناسه قصه معتبر نیست.',
    });
  }

  const deleted = deleteStoryById(id);

  if (!deleted) {
    return res.status(404).json({
      success: false,
      error: 'قصه‌ای با این شناسه پیدا نشد.',
    });
  }

  return res.json({
    success: true,
    message: 'قصه با موفقیت حذف شد.',
  });
});

router.post('/:id/feedback', (req, res) => {
  const storyId = Number(req.params.id);

  if (!Number.isInteger(storyId) || storyId <= 0) {
    return res.status(400).json({
      success: false,
      error: 'شناسه قصه معتبر نیست.',
    });
  }

  const validation = validateFeedbackInput(req.body);

  if (!validation.valid) {
    return res.status(400).json({
      success: false,
      error: validation.errors[0],
      ...(env.isDevelopment && { details: validation.errors.join(' | ') }),
    });
  }

  const feedbackId = saveFeedback(
    storyId,
    validation.data.rating,
    validation.data.note,
  );

  if (!feedbackId) {
    return res.status(404).json({
      success: false,
      error: 'قصه‌ای با این شناسه پیدا نشد.',
    });
  }

  return res.status(201).json({
    success: true,
    feedbackId,
    message: 'بازخورد شما ثبت شد. ممنونیم!',
  });
});

export default router;
