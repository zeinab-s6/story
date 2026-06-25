import env from '../config/env.js';
import { buildStoryPrompt } from './promptBuilder.js';
import { checkStorySafety } from './safetyAgent.js';
import { normalizeStoryOutput } from './outputNormalizer.js';
import { generateStoryWithMock } from '../services/mockStoryService.js';
import { generateStoryWithOpenAI } from '../services/openaiService.js';
import { saveStoryRequestAndResult } from '../repositories/storyRepository.js';
import { saveUsageLog } from '../repositories/usageRepository.js';

const REQUIRED_STORY_FIELDS = [
  'title',
  'ageRange',
  'goal',
  'durationMinutes',
  'parentEffort',
  'parentIntro',
  'storyText',
  'interactionPoints',
  'calmingAction',
  'followUpQuestion',
  'safetyNote',
];

const UNSAFE_USER_MESSAGE =
  'این قصه از نظر ایمنی مناسب نبود. لطفاً ورودی را کمی تغییر دهید.';

function pickStoryFields(story) {
  return {
    title: story.title,
    ageRange: story.ageRange,
    goal: story.goal,
    durationMinutes: story.durationMinutes,
    parentEffort: story.parentEffort,
    parentIntro: story.parentIntro,
    storyText: story.storyText,
    interactionPoints: story.interactionPoints,
    calmingAction: story.calmingAction,
    followUpQuestion: story.followUpQuestion,
    safetyNote: story.safetyNote,
  };
}

function validateStoryShape(story) {
  for (const field of REQUIRED_STORY_FIELDS) {
    if (story[field] === undefined || story[field] === null) {
      return `فیلد "${field}" در قصه تولیدشده وجود ندارد.`;
    }
  }
  if (!Array.isArray(story.interactionPoints)) {
    return 'فیلد interactionPoints باید آرایه باشد.';
  }
  return null;
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

  const story = normalizeStoryOutput(rawStory, input);

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

  const safety = checkStorySafety(story, input.age, input);
  const latencyMs = Date.now() - startTime;

  if (!safety.safe) {
    saveUsageLog({
      storyId: null,
      provider,
      model,
      latencyMs,
      status: 'unsafe',
      errorMessage: safety.reason,
    });

    const response = {
      success: false,
      error: UNSAFE_USER_MESSAGE,
    };

    if (env.isDevelopment) {
      response.details = safety.reason;
    }

    return response;
  }

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
