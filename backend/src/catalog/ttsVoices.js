export const BUILTIN_OPENAI_VOICES = [
  'alloy',
  'ash',
  'ballad',
  'coral',
  'echo',
  'fable',
  'onyx',
  'nova',
  'sage',
  'shimmer',
  'verse',
  'marin',
  'cedar',
];

export function isValidBuiltinVoice(voice) {
  return typeof voice === 'string' && BUILTIN_OPENAI_VOICES.includes(voice.toLowerCase());
}

export function resolveBuiltinVoice(requestedVoice, defaultVoice = 'alloy') {
  if (isValidBuiltinVoice(requestedVoice)) {
    return requestedVoice.toLowerCase();
  }
  if (isValidBuiltinVoice(defaultVoice)) {
    return defaultVoice.toLowerCase();
  }
  return 'alloy';
}
