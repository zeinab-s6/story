import {
  FORBIDDEN_CONCEPTS,
  SMALL_OBJECT_KEYWORDS,
  MAX_STORY_LENGTH,
} from '../catalog/safetyRules.js';
import { getAgeRange } from '../catalog/ageRules.js';

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

function extractUserProvidedTerms(input) {
  if (!input) return [];

  const terms = new Set();
  for (const raw of [input.interest, input.extraContext]) {
    if (typeof raw !== 'string') continue;

    const normalized = raw.trim().toLowerCase();
    if (!normalized) continue;

    terms.add(normalized);
    normalized.split(/[,،;|/]+/).forEach((part) => {
      const token = part.trim();
      if (token) terms.add(token);
    });
  }

  return [...terms];
}

function removeUserTermsFromText(text, terms) {
  let result = text;
  for (const term of terms.sort((a, b) => b.length - a.length)) {
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    result = result.replace(new RegExp(escaped, 'gi'), ' ');
  }
  return result;
}

export function checkStorySafety(story, age, input = null) {
  if (!story || typeof story !== 'object') {
    return { safe: false, reason: 'قصه تولیدشده معتبر نیست.' };
  }

  const text = storyToText(story);
  const userTerms = extractUserProvidedTerms(input);
  const textForKeywordCheck = removeUserTermsFromText(text, userTerms);

  for (const forbidden of FORBIDDEN_CONCEPTS) {
    if (textForKeywordCheck.includes(forbidden.toLowerCase())) {
      return {
        safe: false,
        reason: `محتوای ناامن شناسایی شد: "${forbidden}"`,
      };
    }
  }

  if (age < 3) {
    for (const keyword of SMALL_OBJECT_KEYWORDS) {
      if (textForKeywordCheck.includes(keyword.toLowerCase())) {
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
