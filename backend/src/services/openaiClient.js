import OpenAI from 'openai';
import env from '../config/env.js';

const OFFICIAL_OPENAI_BASE_URL = 'https://api.openai.com/v1';

export function createOpenAIClient({ forTts = false } = {}) {
  if (forTts) {
    const dedicatedTtsKey = env.OPENAI_TTS_API_KEY?.trim();

    if (dedicatedTtsKey) {
      return new OpenAI({
        apiKey: dedicatedTtsKey,
        baseURL: env.OPENAI_TTS_BASE_URL?.trim() || OFFICIAL_OPENAI_BASE_URL,
      });
    }

    const options = { apiKey: env.OPENAI_API_KEY };
    if (env.OPENAI_BASE_URL?.trim()) {
      options.baseURL = env.OPENAI_BASE_URL.trim();
    }
    return new OpenAI(options);
  }

  const options = { apiKey: env.OPENAI_API_KEY };
  if (env.OPENAI_BASE_URL?.trim()) {
    options.baseURL = env.OPENAI_BASE_URL.trim();
  }

  return new OpenAI(options);
}

export default createOpenAIClient;
