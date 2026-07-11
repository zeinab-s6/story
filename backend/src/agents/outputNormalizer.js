import { getAgeRange } from '../catalog/ageRules.js';

const VALID_PARENT_EFFORT = ['low', 'medium', 'high'];

function trimString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeParentEffort(value) {
  const normalized = trimString(value).toLowerCase();
  return VALID_PARENT_EFFORT.includes(normalized) ? normalized : 'low';
}

export function normalizeStoryOutput(rawStory, input) {
  const ageRange = trimString(rawStory.ageRange) || getAgeRange(input.age);

  return {
    title: trimString(rawStory.title),
    ageRange,
    goal: trimString(rawStory.goal) || input.goal,
    durationMinutes: Number(rawStory.durationMinutes) || input.durationMinutes,
    parentEffort: normalizeParentEffort(rawStory.parentEffort),
    parentIntro: trimString(rawStory.parentIntro),
    storyText: trimString(rawStory.storyText),
    safetyNote: trimString(rawStory.safetyNote),
  };
}

export default normalizeStoryOutput;
