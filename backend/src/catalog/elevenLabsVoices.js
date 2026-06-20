/** Preset ElevenLabs voice aliases → voice_id (public library voices). */
export const ELEVENLABS_PRESET_VOICES = {
  rachel: '21m00Tcm4TlvDq8ikWAM',
  domi: 'AZnzlk1XvdvUeBnXmlld',
  bella: 'EXAVITQu4vr4xnSDxMaL',
  antoni: 'ErXwobaYiN019PkySvjV',
  elli: 'MF3mGyEYCl7XYWbV9V6O',
  josh: 'TxGEqnHWrfWFTfGW9XjX',
  arnold: 'VR6AewLTigWG4xSOukaG',
  adam: 'pNInz6obpgDQGcFmaJgB',
  sam: 'yoZ06aMxZJJ28mfd3POQ',
};

const VOICE_ID_PATTERN = /^[a-zA-Z0-9]{15,}$/;

export function isValidElevenLabsVoiceId(voiceId) {
  return typeof voiceId === 'string' && VOICE_ID_PATTERN.test(voiceId.trim());
}

export function isValidElevenLabsVoiceAlias(voice) {
  return (
    typeof voice === 'string' &&
    Object.prototype.hasOwnProperty.call(ELEVENLABS_PRESET_VOICES, voice.toLowerCase())
  );
}

export function isValidElevenLabsVoice(voice) {
  if (!voice || typeof voice !== 'string') {
    return false;
  }
  const trimmed = voice.trim();
  return isValidElevenLabsVoiceAlias(trimmed) || isValidElevenLabsVoiceId(trimmed);
}

export function resolveElevenLabsVoice(requestedVoice, defaultVoiceId) {
  if (requestedVoice && typeof requestedVoice === 'string') {
    const trimmed = requestedVoice.trim();
    const alias = trimmed.toLowerCase();
    if (ELEVENLABS_PRESET_VOICES[alias]) {
      return ELEVENLABS_PRESET_VOICES[alias];
    }
    if (isValidElevenLabsVoiceId(trimmed)) {
      return trimmed;
    }
  }

  if (defaultVoiceId && isValidElevenLabsVoiceId(defaultVoiceId)) {
    return defaultVoiceId.trim();
  }

  return ELEVENLABS_PRESET_VOICES.rachel;
}

export function listElevenLabsPresetVoices() {
  return Object.keys(ELEVENLABS_PRESET_VOICES);
}
