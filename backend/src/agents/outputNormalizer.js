import { getAgeRange } from '../data/ageRules.js';
import { DEFAULT_SAFETY_NOTE } from '../data/safetyRules.js';

const VALID_PARENT_EFFORT = ['low', 'medium', 'high'];

function trimString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeParentEffort(value) {
  const normalized = trimString(value).toLowerCase();
  return VALID_PARENT_EFFORT.includes(normalized) ? normalized : 'low';
}

function normalizeInteractionPoints(value) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item) => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean);
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
    interactionPoints: normalizeInteractionPoints(rawStory.interactionPoints),
    calmingAction: trimString(rawStory.calmingAction),
    followUpQuestion: trimString(rawStory.followUpQuestion),
    safetyNote: trimString(rawStory.safetyNote) || DEFAULT_SAFETY_NOTE,
  };
}

export default normalizeStoryOutput;
