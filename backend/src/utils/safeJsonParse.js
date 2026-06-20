export function extractJsonObject(text) {
  if (typeof text !== 'string') {
    throw new Error('ورودی باید متن باشد.');
  }

  const trimmed = text.trim();

  const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fencedMatch) {
    return fencedMatch[1].trim();
  }

  const firstBrace = trimmed.indexOf('{');
  const lastBrace = trimmed.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    return trimmed.slice(firstBrace, lastBrace + 1);
  }

  return trimmed;
}

export function safeJsonParse(text) {
  const jsonText = extractJsonObject(text);

  try {
    return JSON.parse(jsonText);
  } catch (err) {
    const error = new Error('پاسخ مدل قابل تبدیل به JSON نبود.');
    error.cause = err;
    throw error;
  }
}
