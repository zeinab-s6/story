import OpenAI from 'openai';
import env from '../config/env.js';

const OFFICIAL_OPENAI_BASE_URL = 'https://api.openai.com/v1';

export function createOpenAIClient({ forTts = false } = {}) {
  if (forTts) {
    const ttsKey = (env.OPENAI_TTS_API_KEY?.trim() || env.OPENAI_API_KEY?.trim() || '');
    const ttsBaseURL = (
      env.OPENAI_TTS_BASE_URL?.trim()
      || env.OPENAI_BASE_URL?.trim()
      || OFFICIAL_OPENAI_BASE_URL
    );

    if (!ttsKey) {
      throw new Error('کلید API برای OpenAI TTS تنظیم نشده است.');
    }

    return new OpenAI({
      apiKey: ttsKey,
      baseURL: ttsBaseURL,
    });
  }

  const options = { apiKey: env.OPENAI_API_KEY };
  if (env.OPENAI_BASE_URL?.trim()) {
    options.baseURL = env.OPENAI_BASE_URL.trim();
  }

  return new OpenAI(options);
}

export default createOpenAIClient;
