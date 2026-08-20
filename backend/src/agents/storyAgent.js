import env from '../config/env.js';
import { buildStoryPrompt, buildDurationAdjustPrompt } from './promptBuilder.js';
import { normalizeStoryOutput } from './outputNormalizer.js';
import { generateStoryWithMock } from '../services/mockStoryService.js';
import { generateStoryWithOpenAI } from '../services/openaiService.js';
import { saveStoryRequestAndResult } from '../repositories/storyRepository.js';
import { saveUsageLog } from '../repositories/usageRepository.js';
import {
  classifyStoryLength,
  countStoryWords,
  getDurationTargets,
} from '../catalog/storyDuration.js';

const REQUIRED_STORY_FIELDS = [
  'title',
  'ageRange',
  'goal',
  'durationMinutes',
  'parentEffort',
  'parentIntro',
  'storyText',
  'safetyNote',
];

function pickStoryFields(story) {
  return {
    title: story.title,
    ageRange: story.ageRange,
    goal: story.goal,
    durationMinutes: story.durationMinutes,
    parentEffort: story.parentEffort,
    parentIntro: story.parentIntro,
    storyText: story.storyText,
    safetyNote: story.safetyNote,
  };
}

function validateStoryShape(story) {
  for (const field of REQUIRED_STORY_FIELDS) {
    if (story[field] === undefined || story[field] === null) {
      return `فیلد "${field}" در قصه تولیدشده وجود ندارد.`;
    }
  }
  return null;
}

async function adjustStoryToDuration(story, input) {
  if (env.STORY_PROVIDER !== 'openai') {
    return story;
  }

  const maxAttempts = 4;
  let current = story;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const lengthClass = classifyStoryLength(current.storyText, input.durationMinutes);
    if (lengthClass === 'ok') {
      return current;
    }

    const wordCount = countStoryWords(current.storyText);
    const adjustPrompt = buildDurationAdjustPrompt(input, current, wordCount, lengthClass);

    try {
      const rawAdjusted = await generateStoryWithOpenAI(adjustPrompt);
      const adjusted = normalizeStoryOutput(rawAdjusted, input);
      const shapeError = validateStoryShape(adjusted);
      if (shapeError || !adjusted.storyText) {
        continue;
      }

      const targets = getDurationTargets(input.durationMinutes);
      const beforeWords = countStoryWords(current.storyText);
      const afterWords = countStoryWords(adjusted.storyText);
      const beforeDist = Math.abs(beforeWords - targets.targetWords);
      const afterDist = Math.abs(afterWords - targets.targetWords);
      const afterClass = classifyStoryLength(adjusted.storyText, input.durationMinutes);

      if (afterClass === 'ok' || afterDist < beforeDist) {
        if (env.isDevelopment || env.LOG_LEVEL === 'debug') {
          console.info(
            '[story-duration]',
            `attempt ${attempt}: ${lengthClass}→${afterClass}`,
            `${beforeWords}→${afterWords} words`,
            `(target ${targets.targetWords})`,
          );
        }
        current = {
          ...adjusted,
          durationMinutes: targets.durationMinutes,
        };
        if (afterClass === 'ok') {
          return current;
        }
      }
    } catch (err) {
      if (env.isDevelopment || env.LOG_LEVEL === 'debug') {
        console.warn('[story-duration] adjust failed:', err.message);
      }
    }
  }

  return current;
}

export async function createStory(input) {
  const provider = env.STORY_PROVIDER;
  const model = provider === 'openai' ? env.OPENAI_MODEL : null;
  const promptVersion = env.PROMPT_VERSION;
  const prompt = buildStoryPrompt(input);
  const startTime = Date.now();

  let rawStory;
  let status = 'success';
  let errorMessage = null;

  try {
    if (provider === 'mock') {
      rawStory = generateStoryWithMock(input);
    } else if (provider === 'openai') {
      rawStory = await generateStoryWithOpenAI(prompt);
    } else {
      throw new Error(`ارائه‌دهنده قصه نامعتبر است: ${provider}`);
    }
  } catch (err) {
    status = 'error';
    errorMessage = err.message;
    saveUsageLog({
      storyId: null,
      provider,
      model,
      latencyMs: Date.now() - startTime,
      status,
      errorMessage,
    });
    throw err;
  }

  let story = normalizeStoryOutput(rawStory, input);

  const shapeError = validateStoryShape(story);
  if (shapeError) {
    status = 'error';
    errorMessage = shapeError;
    saveUsageLog({
      storyId: null,
      provider,
      model,
      latencyMs: Date.now() - startTime,
      status,
      errorMessage,
    });
    const err = new Error(shapeError);
    err.statusCode = 502;
    throw err;
  }

  // Force durationMinutes from the parent's selection (not the model's echo).
  story = {
    ...story,
    durationMinutes: getDurationTargets(input.durationMinutes).durationMinutes,
  };

  story = await adjustStoryToDuration(story, input);
  story = {
    ...story,
    durationMinutes: getDurationTargets(input.durationMinutes).durationMinutes,
  };

  const latencyMs = Date.now() - startTime;

  const storyId = saveStoryRequestAndResult(
    input,
    story,
    provider,
    model,
    promptVersion,
    'safe',
    null,
  );

  saveUsageLog({
    storyId,
    provider,
    model,
    latencyMs,
    status: 'success',
    errorMessage: null,
  });

  return {
    success: true,
    storyId,
    provider,
    story: pickStoryFields(story),
  };
}

export default createStory;
