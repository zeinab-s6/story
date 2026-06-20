/** Avasho / Ivira TTS speakers (Persian). */
export const IVIRA_SPEAKERS = {
  afra: 1,
  garsha: 2,
  sara: 3,
  dara: 4,
  poneh: 5,
  bahar: 6,
};

/** Map OpenAI-style voice ids from the frontend to Ivira speakers. */
export const OPENAI_TO_IVIRA_SPEAKER = {
  onyx: IVIRA_SPEAKERS.dara,
  nova: IVIRA_SPEAKERS.bahar,
  echo: IVIRA_SPEAKERS.garsha,
  alloy: IVIRA_SPEAKERS.afra,
  shimmer: IVIRA_SPEAKERS.sara,
  fable: IVIRA_SPEAKERS.poneh,
  sage: IVIRA_SPEAKERS.afra,
  verse: IVIRA_SPEAKERS.garsha,
};

export function isValidIviraSpeaker(value) {
  if (value === undefined || value === null) {
    return false;
  }

  if (typeof value === 'number') {
    return Number.isInteger(value) && value >= 1 && value <= 6;
  }

  if (typeof value !== 'string') {
    return false;
  }

  const trimmed = value.trim().toLowerCase();
  if (/^[1-6]$/.test(trimmed)) {
    return true;
  }

  return (
    Object.prototype.hasOwnProperty.call(IVIRA_SPEAKERS, trimmed) ||
    Object.prototype.hasOwnProperty.call(OPENAI_TO_IVIRA_SPEAKER, trimmed)
  );
}

export function resolveIviraSpeaker(requestedVoice, defaultSpeaker = IVIRA_SPEAKERS.bahar) {
  const fallback = Number(defaultSpeaker) || IVIRA_SPEAKERS.bahar;

  if (requestedVoice === undefined || requestedVoice === null || requestedVoice === '') {
    return fallback;
  }

  if (typeof requestedVoice === 'number' && isValidIviraSpeaker(requestedVoice)) {
    return requestedVoice;
  }

  if (typeof requestedVoice !== 'string') {
    return fallback;
  }

  const trimmed = requestedVoice.trim().toLowerCase();

  if (/^[1-6]$/.test(trimmed)) {
    return Number(trimmed);
  }

  if (IVIRA_SPEAKERS[trimmed]) {
    return IVIRA_SPEAKERS[trimmed];
  }

  if (OPENAI_TO_IVIRA_SPEAKER[trimmed]) {
    return OPENAI_TO_IVIRA_SPEAKER[trimmed];
  }

  return fallback;
}

export function listIviraPresetVoices() {
  return Object.keys(IVIRA_SPEAKERS);
}

export function speakerIdToLabel(speakerId) {
  const entry = Object.entries(IVIRA_SPEAKERS).find(([, id]) => id === Number(speakerId));
  return entry ? entry[0] : 'bahar';
}
