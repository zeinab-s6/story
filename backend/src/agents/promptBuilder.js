import { getAgeRange, getAgeRules } from '../catalog/ageRules.js';
import { STORY_GOALS } from '../catalog/storyGoals.js';
import { getDurationTargets } from '../catalog/storyDuration.js';

export function buildStoryPrompt(input) {
  const ageRange = getAgeRange(input.age);
  const ageRules = getAgeRules(input.age);
  const goalInfo = STORY_GOALS[input.goal];
  const duration = getDurationTargets(input.durationMinutes);

  const goalGuidance = {
    sleep: 'If sleep: use calm rhythm, slow pacing, and gentle winding-down language.',
    food: 'If food: encourage curiosity about food, never pressure to eat.',
    cleanup: 'If cleanup: make tidying a soft mission, not nagging or punishment.',
    calm: 'If calm: validate feelings gently, especially if angry or sad.',
    waiting: 'If waiting: keep it playable without requiring any objects; still honor the selected duration length.',
    'screen-free': 'If screen-free: offer imagination and play instead of screens.',
    brushing: 'If brushing: make tooth brushing a gentle, fun adventure.',
    bath: 'If bath: make bath time cozy, warm, and playful.',
    dressing: 'If dressing: make getting dressed feel like a small achievable adventure.',
  };

  const moodGuidance = {
    angry: 'The child feels angry — validate feelings gently without lecturing.',
    sad: 'The child feels sad — offer warmth and reassurance.',
    restless: 'The child feels restless — use gentle movement and rhythm.',
    sleepy: 'The child feels sleepy — use very soft, slow language.',
    bored: 'The child feels bored — spark gentle curiosity.',
    excited: 'The child feels excited — channel energy into playful interaction.',
    calm: 'The child feels calm — maintain a peaceful tone.',
  };

  const childContext = input.childName
    ? `Child name: ${input.childName}`
    : 'Child name: not provided (use a gentle generic character)';

  const extraContext = input.extraContext
    ? `Extra parent context: ${input.extraContext}`
    : '';

  const lengthLabel = duration.durationMinutes === 1
    ? 'a 1-minute'
    : `a ${duration.durationMinutes}-minute`;

  return `You are a personalized story assistant for parents of children aged 0 to 8.

Create ${lengthLabel} bedtime-style story in Persian (Farsi).

OUTPUT RULES (strict):
- Output language: Persian (Farsi) only
- Return JSON only — no markdown, no code fences, no extra text before or after
- All string values must be in Persian

STORY REQUIREMENTS:
- Gentle, warm tone
- Respect the parent's context and wording — use their themes and phrases freely
- Indirect guidance only — no direct preaching or lecturing
- Match the child's mood: ${input.mood} — ${moodGuidance[input.mood] || ''}

DURATION LENGTH (STRICT — most important):
- The parent selected exactly ${duration.durationMinutes} minute(s) of read-aloud / narration time.
- storyText MUST be readable aloud in about ${duration.durationMinutes} minute(s) at a calm narration pace (~${duration.wordsPerMinute} Persian words per minute).
- Target length for storyText: about ${duration.targetWords} words (acceptable range: ${duration.minWords}–${duration.maxWords} words).
- This length will also drive TTS audio timing to ~${duration.targetSeconds} seconds — hit the word target closely.
- Count whitespace-separated Persian words in storyText only (not title/parentIntro).
- Do NOT write a tiny micro-story if duration is 3–5 minutes.
- Do NOT pad with meaningless repetition; expand with gentle scenes, sensory detail, soft dialogue, and calm pacing instead.
- parentIntro should stay short (1–2 sentences). Length control applies to storyText.

CHILD PROFILE:
- Age: ${input.age} years (age range: ${ageRange})
- Interest/theme: ${input.interest}
- Goal: ${input.goal} — ${goalInfo.labelFa} (${goalInfo.labelEn})
- ${childContext}
${extraContext ? `- ${extraContext}` : ''}

AGE-SPECIFIC RULES (${ageRange}):
${ageRules.rules.map((r) => `- ${r}`).join('\n')}
- Age rules affect sentence style and complexity, NOT total story length. Honor the duration word target above.

GOAL-SPECIFIC GUIDANCE:
${goalGuidance[input.goal]}

Return JSON only with this exact schema:
{
  "title": "",
  "ageRange": "${ageRange}",
  "goal": "${input.goal}",
  "durationMinutes": ${duration.durationMinutes},
  "parentEffort": "low | medium | high",
  "parentIntro": "",
  "storyText": "",
  "safetyNote": ""
}`;
}

/**
 * Second-pass prompt when the first story misses the duration word window.
 */
export function buildDurationAdjustPrompt(input, story, wordCount, lengthClass) {
  const duration = getDurationTargets(input.durationMinutes);
  const direction = lengthClass === 'short'
    ? `TOO SHORT (${wordCount} words). Expand storyText to about ${duration.targetWords} words (range ${duration.minWords}–${duration.maxWords}). Add gentle scenes, soft dialogue, sensory detail, and calm pacing. Keep the same characters, goal, and mood. Do not invent scary or pressuring content.`
    : `TOO LONG (${wordCount} words). Shorten storyText to about ${duration.targetWords} words (range ${duration.minWords}–${duration.maxWords}). Keep the core plot, warmth, and ending. Remove extra digressions.`;

  return `You previously wrote a Persian children's story that does not match the selected read-aloud duration.

Fix ONLY the length of storyText.

SELECTED DURATION: ${duration.durationMinutes} minute(s)
TARGET: ~${duration.targetWords} words (range ${duration.minWords}–${duration.maxWords})
CURRENT PROBLEM: ${direction}

Keep:
- Persian (Farsi) only
- Same title theme, goal (${input.goal}), mood (${input.mood}), interest (${input.interest})
- Age-appropriate gentle tone for age ${input.age}
- JSON-only response with the same schema

Current story JSON to revise:
${JSON.stringify({
    title: story.title,
    ageRange: story.ageRange,
    goal: story.goal,
    durationMinutes: duration.durationMinutes,
    parentEffort: story.parentEffort,
    parentIntro: story.parentIntro,
    storyText: story.storyText,
    safetyNote: story.safetyNote,
  }, null, 2)}

Return the full revised JSON only.`;
}

export default buildStoryPrompt;
