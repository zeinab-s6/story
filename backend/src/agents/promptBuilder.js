import { getAgeRange, getAgeRules } from '../catalog/ageRules.js';
import { STORY_GOALS } from '../catalog/storyGoals.js';

export function buildStoryPrompt(input) {
  const ageRange = getAgeRange(input.age);
  const ageRules = getAgeRules(input.age);
  const goalInfo = STORY_GOALS[input.goal];

  const goalGuidance = {
    sleep: 'If sleep: use calm rhythm, slow pacing, and gentle winding-down language.',
    food: 'If food: encourage curiosity about food, never pressure to eat.',
    cleanup: 'If cleanup: make tidying a soft mission, not nagging or punishment.',
    calm: 'If calm: validate feelings gently, especially if angry or sad.',
    waiting: 'If waiting: keep it short and playable without requiring any objects.',
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

  return `You are a personalized story assistant for parents of children aged 0 to 7.

Create a short, safe, age-appropriate story in Persian (Farsi).

OUTPUT RULES (strict):
- Output language: Persian (Farsi) only
- Return JSON only — no markdown, no code fences, no extra text before or after
- All string values must be in Persian

STORY REQUIREMENTS:
- Gentle, warm, safe, age-appropriate tone
- No fear, shame, threat, punishment, violence, medicine, diagnosis, or unsafe actions
- No scaring, shaming, threatening, pressuring, diagnosing, or medical/psychological advice
- Indirect guidance only — no direct preaching or lecturing
- Match the child's mood: ${input.mood} — ${moodGuidance[input.mood] || ''}
- Target duration: approximately ${input.durationMinutes} minutes when read aloud

CHILD PROFILE:
- Age: ${input.age} years (age range: ${ageRange})
- Interest/theme: ${input.interest}
- Goal: ${input.goal} — ${goalInfo.labelFa} (${goalInfo.labelEn})
- ${childContext}
${extraContext ? `- ${extraContext}` : ''}

AGE-SPECIFIC RULES (${ageRange}):
${ageRules.rules.map((r) => `- ${r}`).join('\n')}

GOAL-SPECIFIC GUIDANCE:
${goalGuidance[input.goal]}

Return JSON only with this exact schema:
{
  "title": "",
  "ageRange": "${ageRange}",
  "goal": "${input.goal}",
  "durationMinutes": ${input.durationMinutes},
  "parentEffort": "low | medium | high",
  "parentIntro": "",
  "storyText": "",
  "interactionPoints": [],
  "calmingAction": "",
  "followUpQuestion": "",
  "safetyNote": ""
}`;
}

export default buildStoryPrompt;
