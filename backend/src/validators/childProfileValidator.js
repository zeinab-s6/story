import { CHILD_GENDERS } from '../catalog/childAvatars.js';

const SCRIPT_PATTERN = /<\s*script\b[^>]*>[\s\S]*?<\s*\/\s*script\s*>/gi;
const HTML_TAG_PATTERN = /<[^>]+>/g;

function sanitizeString(value, maxLength) {
  if (typeof value !== 'string') return null;
  let trimmed = value.trim();
  if (!trimmed) return null;
  trimmed = trimmed.replace(SCRIPT_PATTERN, '').replace(HTML_TAG_PATTERN, '');
  return trimmed.slice(0, maxLength);
}

export function validateChildProfileInput(body) {
  const childGender = body?.childGender?.trim().toLowerCase() || '';
  const hasChildName = body?.childName !== undefined && body?.childName !== null && body?.childName !== '';
  const hasDisplayName = body?.displayName !== undefined && body?.displayName !== null && body?.displayName !== '';

  let childName = null;
  if (hasChildName) {
    childName = sanitizeString(String(body.childName), 40);
    if (!childName) {
      return { valid: false, errors: ['نام فرزند معتبر نیست.'] };
    }
  } else if (body?.childName === '') {
    childName = null;
  }

  let displayName = null;
  if (hasDisplayName) {
    displayName = sanitizeString(String(body.displayName), 60);
    if (!displayName) {
      return { valid: false, errors: ['نقش شما معتبر نیست.'] };
    }
  }

  if (!childGender && body?.childName === undefined && body?.displayName === undefined) {
    return { valid: false, errors: ['حداقل یک فیلد برای به‌روزرسانی لازم است.'] };
  }

  if (childGender && !CHILD_GENDERS.includes(childGender)) {
    return { valid: false, errors: ['جنسیت انتخاب‌شده معتبر نیست.'] };
  }

  const data = {};
  if (childGender) data.childGender = childGender;
  if (body?.childName !== undefined) data.childName = childName;
  if (body?.displayName !== undefined) data.displayName = displayName;

  return { valid: true, data };
}
