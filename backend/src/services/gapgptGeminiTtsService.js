import env from '../config/env.js';

const OPENAI_TO_GEMINI_VOICE = {
  nova: 'Kore',
  shimmer: 'Aoede',
  coral: 'Puck',
  alloy: 'Charon',
  echo: 'Orus',
  fable: 'Leda',
  onyx: 'Fenrir',
  sage: 'Zephyr',
  ash: 'Puck',
  ballad: 'Callirrhoe',
  verse: 'Aoede',
  marin: 'Kore',
  cedar: 'Charon',
};

const GEMINI_VOICES = new Set([
  'Zephyr', 'Puck', 'Charon', 'Kore', 'Fenrir', 'Leda', 'Orus', 'Aoede',
  'Callirrhoe', 'Iapetus', 'Umbriel', 'Algieba', 'Despina', 'Erinome',
  'Algenib', 'Laomedeia', 'Achernar', 'Gacrux', 'Pulcherrima', 'Achird',
  'Zubenelgenubi', 'Vindemiatrix', 'Sadachbia', 'Sadaltager', 'Sulafat',
]);

export function isGeminiTtsModel(model = env.OPENAI_TTS_MODEL) {
  return /gemini.*tts/i.test(String(model || ''));
}

export function resolveGeminiVoice(requestedVoice, defaultVoice = env.OPENAI_TTS_VOICE) {
  const pick = (voice) => {
    if (typeof voice !== 'string' || !voice.trim()) {
      return null;
    }
    const trimmed = voice.trim();
    const mapped = OPENAI_TO_GEMINI_VOICE[trimmed.toLowerCase()];
    if (mapped) {
      return mapped;
    }
    const titled = trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
    if (GEMINI_VOICES.has(titled)) {
      return titled;
    }
    if (GEMINI_VOICES.has(trimmed)) {
      return trimmed;
    }
    return null;
  };

  return pick(requestedVoice) || pick(defaultVoice) || 'Kore';
}

function pcmToWav(pcmBuffer, sampleRate = 24000, numChannels = 1, bitsPerSample = 16) {
  const dataSize = pcmBuffer.length;
  const buffer = Buffer.alloc(44 + dataSize);

  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * numChannels * (bitsPerSample / 8), 28);
  buffer.writeUInt16LE(numChannels * (bitsPerSample / 8), 32);
  buffer.writeUInt16LE(bitsPerSample, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);
  pcmBuffer.copy(buffer, 44);

  return buffer;
}

function getGeminiTtsConfig() {
  const apiKey = env.OPENAI_TTS_API_KEY?.trim() || env.OPENAI_API_KEY?.trim();
  const baseURL = (env.OPENAI_TTS_BASE_URL?.trim() || env.OPENAI_BASE_URL?.trim() || '').replace(/\/$/, '');

  if (!apiKey) {
    const error = new Error('کلید API GapGPT تنظیم نشده است.');
    error.statusCode = 500;
    throw error;
  }

  if (!baseURL) {
    const error = new Error('آدرس API GapGPT تنظیم نشده است.');
    error.statusCode = 500;
    throw error;
  }

  return { apiKey, baseURL, model: env.OPENAI_TTS_MODEL };
}

export async function synthesizeWithGapGptGeminiTts({
  narrationText,
  voice,
}) {
  const { apiKey, baseURL, model } = getGeminiTtsConfig();
  const geminiVoice = resolveGeminiVoice(voice);
  const transcript = String(narrationText || '').trim();

  if (!transcript) {
    const error = new Error('متن روایت برای تولید صدا خالی است.');
    error.statusCode = 400;
    throw error;
  }

  let response;
  try {
    response = await fetch(`${baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: transcript }],
        modalities: ['audio'],
        audio: { voice: geminiVoice, format: 'mp3' },
      }),
    });
  } catch (err) {
    const error = new Error('خطا در اتصال به GapGPT برای تولید صدا.');
    error.statusCode = 502;
    if (env.isDevelopment) {
      error.details = err.message;
    }
    throw error;
  }

  let payload;
  try {
    payload = await response.json();
  } catch {
    const error = new Error('پاسخ نامعتبر از GapGPT TTS.');
    error.statusCode = 502;
    throw error;
  }

  if (!response.ok) {
    const providerMessage = payload?.error?.message || response.statusText;
    const error = new Error(
      response.status === 429
        ? 'سقف درخواست TTS در GapGPT پر شده. کمی بعد دوباره تلاش کنید.'
        : `خطا در تولید صدا با GapGPT: ${providerMessage}`,
    );
    error.statusCode = response.status === 429 ? 429 : 502;
    error.code = payload?.error?.code;
    if (env.isDevelopment) {
      error.details = providerMessage;
    }
    throw error;
  }

  const audioData = payload?.choices?.[0]?.message?.audio?.data;
  if (!audioData) {
    const error = new Error('GapGPT فایل صوتی برنگرداند.');
    error.statusCode = 502;
    if (env.isDevelopment) {
      error.details = JSON.stringify(payload?.choices?.[0]?.message || {}).slice(0, 500);
    }
    throw error;
  }

  const pcmBuffer = Buffer.from(audioData, 'base64');
  const wavBuffer = pcmToWav(pcmBuffer);

  return {
    audioBuffer: wavBuffer,
    model,
    voice: geminiVoice,
    format: 'wav',
    provider: 'gapgpt-gemini',
  };
}

export default {
  isGeminiTtsModel,
  resolveGeminiVoice,
  synthesizeWithGapGptGeminiTts,
};
