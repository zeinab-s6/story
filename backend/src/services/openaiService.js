import env from '../config/env.js';
import { safeJsonParse } from '../utils/safeJsonParse.js';
import createOpenAIClient from './openaiClient.js';

export async function generateStoryWithOpenAI(prompt) {
  const apiKey = env.OPENAI_API_KEY;
  const model = env.OPENAI_MODEL;

  if (!apiKey?.trim()) {
    throw new Error('کلید API اوپن‌ای‌آی تنظیم نشده است.');
  }

  if (!model?.trim()) {
    throw new Error('مدل اوپن‌ای‌آی تنظیم نشده است.');
  }

  const client = createOpenAIClient();

  let completion;
  try {
    completion = await client.chat.completions.create({
      model,
      messages: [
        {
          role: 'system',
          content:
            'You are a safe children\'s story generator for Persian-speaking families. Always respond with valid JSON only — no markdown, no extra text.',
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.7,
    });
  } catch (err) {
    const error = new Error('خطا در ارتباط با OpenAI. لطفاً دوباره تلاش کنید.');
    error.statusCode = 502;
    if (env.isDevelopment) {
      error.details = err.message;
    }
    throw error;
  }

  const content = completion.choices?.[0]?.message?.content;
  if (!content) {
    const error = new Error('پاسخی از OpenAI دریافت نشد.');
    error.statusCode = 502;
    throw error;
  }

  try {
    return safeJsonParse(content);
  } catch (err) {
    const error = new Error('پاسخ OpenAI قابل تبدیل به JSON نبود. لطفاً دوباره تلاش کنید.');
    error.statusCode = 502;
    if (env.isDevelopment) {
      error.details = err.cause?.message || err.message;
    }
    throw error;
  }
}

export default generateStoryWithOpenAI;
