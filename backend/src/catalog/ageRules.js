export const AGE_RULES = {
  '0-2': {
    ageRange: '0-2',
    rules: [
      'very short sentences',
      'soft sensory language',
      'no small objects, no complex plot',
    ],
    rulesFa: [
      'جملات بسیار کوتاه',
      'زبان حسی و نرم',
      'بدون اشیای کوچک و بدون داستان پیچیده',
    ],
  },
  '3-5': {
    ageRange: '3-5',
    rules: [
      'simple mission',
      'gentle repetition',
      'one clear character',
    ],
    rulesFa: [
      'ماموریت ساده',
      'تکرار ملایم',
      'یک شخصیت مشخص',
    ],
  },
  '6-7': {
    ageRange: '6-7',
    rules: [
      'slightly more choice',
      'small problem and resolution',
      'more interaction',
    ],
    rulesFa: [
      'انتخاب‌های بیشتر',
      'مشکل کوچک و حل آن',
      'تعامل بیشتر',
    ],
  },
};

export function getAgeRange(age) {
  if (age <= 2) return '0-2';
  if (age <= 5) return '3-5';
  return '6-7';
}

export function getAgeRules(age) {
  return AGE_RULES[getAgeRange(age)];
}
