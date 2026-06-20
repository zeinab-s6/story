import {
  FORBIDDEN_CONCEPTS,
  SMALL_OBJECT_KEYWORDS,
  MAX_STORY_LENGTH,
} from '../data/safetyRules.js';
import { getAgeRange } from '../data/ageRules.js';

function storyToText(story) {
  const parts = [
    story.title,
    story.parentIntro,
    story.storyText,
    story.calmingAction,
    story.followUpQuestion,
    story.safetyNote,
    ...(story.interactionPoints || []),
  ];
  return parts.filter(Boolean).join(' ').toLowerCase();
}

export function checkStorySafety(story, age) {
  if (!story || typeof story !== 'object') {
    return { safe: false, reason: 'قصه تولیدشده معتبر نیست.' };
  }

  const text = storyToText(story);

  for (const forbidden of FORBIDDEN_CONCEPTS) {
    if (text.includes(forbidden.toLowerCase())) {
      return {
        safe: false,
        reason: `محتوای ناامن شناسایی شد: "${forbidden}"`,
      };
    }
  }

  if (age < 3) {
    for (const keyword of SMALL_OBJECT_KEYWORDS) {
      if (text.includes(keyword.toLowerCase())) {
        return {
          safe: false,
          reason: `برای این سن، اشاره به "${keyword}" مناسب نیست.`,
        };
      }
    }
  }

  const ageRange = getAgeRange(age);
  const maxLength = MAX_STORY_LENGTH[ageRange];
  if (story.storyText && story.storyText.length > maxLength) {
    return {
      safe: false,
      reason: `قصه برای سن ${ageRange} بیش از حد طولانی است (حداکثر ${maxLength} کاراکتر).`,
    };
  }

  return { safe: true, reason: null };
}

export default checkStorySafety;
