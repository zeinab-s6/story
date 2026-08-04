/**
 * Target spoken pace for Persian kids' stories + TTS (~calm narration).
 * Must stay in sync with frontend estimateReadingMinutes.
 *
 * Calibrated slightly above parent bedtime reading so TTS runtime
 * lands closer to the selected 1–5 minutes.
 */
export const WORDS_PER_MINUTE = 96;

/** Tight window around the word target (±10%). */
const TOLERANCE = 0.1;

/** Acceptable audio length error after ffmpeg fit (seconds). */
export const AUDIO_DURATION_TOLERANCE_SEC = 2;

/**
 * @param {number} durationMinutes - integer 1..5
 * @returns {{
 *   durationMinutes: number,
 *   targetWords: number,
 *   minWords: number,
 *   maxWords: number,
 *   wordsPerMinute: number,
 *   targetSeconds: number,
 * }}
 */
export function getDurationTargets(durationMinutes) {
  const minutes = Number(durationMinutes);
  const safeMinutes = Number.isFinite(minutes) && minutes >= 1 && minutes <= 5
    ? Math.round(minutes)
    : 3;

  const targetWords = safeMinutes * WORDS_PER_MINUTE;
  const minWords = Math.max(48, Math.round(targetWords * (1 - TOLERANCE)));
  const maxWords = Math.round(targetWords * (1 + TOLERANCE));

  return {
    durationMinutes: safeMinutes,
    targetWords,
    minWords,
    maxWords,
    wordsPerMinute: WORDS_PER_MINUTE,
    targetSeconds: safeMinutes * 60,
  };
}

export function countStoryWords(text) {
  const trimmed = String(text || '').trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).filter(Boolean).length;
}

/**
 * @returns {'ok'|'short'|'long'}
 */
export function classifyStoryLength(text, durationMinutes) {
  const { minWords, maxWords } = getDurationTargets(durationMinutes);
  const words = countStoryWords(text);
  if (words < minWords) return 'short';
  if (words > maxWords) return 'long';
  return 'ok';
}

export default {
  WORDS_PER_MINUTE,
  AUDIO_DURATION_TOLERANCE_SEC,
  getDurationTargets,
  countStoryWords,
  classifyStoryLength,
};
