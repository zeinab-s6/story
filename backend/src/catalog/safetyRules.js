export const FORBIDDEN_CONCEPTS = [
  'ترسناک',
  'هیولا',
  'خون',
  'چاقو',
  'آتش',
  'تنبیه',
  'تهدید',
  'خجالت',
  'شرمنده',
  'گریه کن تا',
  'تنها برو',
  'از پنجره',
  'دارو',
  'قرص',
  'medicine',
  'pill',
  'knife',
  'blood',
  'monster',
  'punishment',
  'shame',
  'threat',
  'violence',
  'fire',
  'alone',
  'window',
];

export const SMALL_OBJECT_KEYWORDS = [
  'سکه',
  'مهره',
  'دکمه',
  'تیله',
  'قطعه کوچک',
  'beads',
  'coin',
  'button',
  'marble',
  'tiny object',
  'small part',
];

// Character soft-caps scaled for up to ~5 minutes (~400 words of calm Persian).
// Age rules still control sentence style; duration controls total length.
export const MAX_STORY_LENGTH = {
  '0-2': 3200,
  '3-5': 4000,
  '6-7': 4800,
};

export const DEFAULT_SAFETY_NOTE =
  'این قصه باید آرام، کوتاه و بدون ترساندن یا فشار اجرا شود.';
