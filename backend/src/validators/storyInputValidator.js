import { VALID_GOALS } from '../data/storyGoals.js';

const VALID_MOODS = ['calm', 'angry', 'restless', 'sleepy', 'bored', 'sad', 'excited'];
const VALID_DURATIONS = [2, 3, 5];
const MAX_BODY_KEYS = 20;

const SCRIPT_PATTERN = /<\s*script\b[^>]*>[\s\S]*?<\s*\/\s*script\s*>/gi;
const HTML_TAG_PATTERN = /<[^>]+>/g;

function sanitizeString(value, maxLength) {
  if (typeof value !== 'string') return null;
  let trimmed = value.trim();
  if (!trimmed) return null;
  trimmed = trimmed.replace(SCRIPT_PATTERN, '').replace(HTML_TAG_PATTERN, '');
  return trimmed.slice(0, maxLength);
}

export function validateStoryInput(body) {
  const errors = [];

  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    return { valid: false, errors: ['بدنه درخواست باید یک شیء JSON باشد.'] };
  }

  if (Object.keys(body).length > MAX_BODY_KEYS) {
    return { valid: false, errors: ['حجم درخواست بیش از حد مجاز است.'] };
  }

  const age = Number(body.age);
  if (!Number.isInteger(age) || age < 0 || age > 7) {
    errors.push('سن باید عددی بین ۰ تا ۷ باشد.');
  }

  const interest = sanitizeString(body.interest, 80);
  if (!interest) {
    errors.push('علاقه‌مندی باید یک متن غیرخالی (حداکثر ۸۰ کاراکتر) باشد.');
  }

  const goal = typeof body.goal === 'string' ? body.goal.trim() : '';
  if (!VALID_GOALS.includes(goal)) {
    errors.push('هدف قصه معتبر نیست. یکی از اهداف مجاز را انتخاب کنید.');
  }

  const mood = typeof body.mood === 'string' ? body.mood.trim() : '';
  if (!VALID_MOODS.includes(mood)) {
    errors.push('حالت روحی معتبر نیست. یکی از حالت‌های مجاز را انتخاب کنید.');
  }

  const durationMinutes = Number(body.durationMinutes);
  if (!VALID_DURATIONS.includes(durationMinutes)) {
    errors.push('مدت زمان باید ۲، ۳ یا ۵ دقیقه باشد.');
  }

  let childName = null;
  if (body.childName !== undefined && body.childName !== null && body.childName !== '') {
    childName = sanitizeString(body.childName, 40);
    if (!childName) {
      errors.push('نام کودک باید حداکثر ۴۰ کاراکتر باشد.');
    }
  }

  let extraContext = null;
  if (body.extraContext !== undefined && body.extraContext !== null && body.extraContext !== '') {
    extraContext = sanitizeString(body.extraContext, 240);
    if (!extraContext) {
      errors.push('توضیح اضافی باید حداکثر ۲۴۰ کاراکتر باشد.');
    }
  }

  let sessionId = null;
  if (body.sessionId !== undefined && body.sessionId !== null && body.sessionId !== '') {
    sessionId = sanitizeString(body.sessionId, 120);
    if (!sessionId) {
      errors.push('شناسه نشست باید حداکثر ۱۲۰ کاراکتر باشد.');
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    data: {
      age,
      interest,
      goal,
      mood,
      durationMinutes,
      childName,
      extraContext,
      sessionId,
    },
  };
}
