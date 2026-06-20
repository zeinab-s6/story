import { createHmac, timingSafeEqual } from 'crypto';
import env from '../config/env.js';

function base64urlEncode(value) {
  const json = typeof value === 'string' ? value : JSON.stringify(value);
  return Buffer.from(json).toString('base64url');
}

function base64urlDecode(value) {
  return JSON.parse(Buffer.from(value, 'base64url').toString('utf8'));
}

export function signToken(payload, expiresInSec = 60 * 60 * 24 * 7) {
  const secret = env.JWT_SECRET;
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const body = { ...payload, iat: now, exp: now + expiresInSec };
  const encodedHeader = base64urlEncode(header);
  const encodedPayload = base64urlEncode(body);
  const signature = createHmac('sha256', secret)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest('base64url');
  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

export function verifyToken(token) {
  if (!token || typeof token !== 'string') {
    return null;
  }

  const parts = token.split('.');
  if (parts.length !== 3) {
    return null;
  }

  const [encodedHeader, encodedPayload, signature] = parts;
  const expected = createHmac('sha256', env.JWT_SECRET)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest('base64url');

  const sigBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);

  if (sigBuffer.length !== expectedBuffer.length || !timingSafeEqual(sigBuffer, expectedBuffer)) {
    return null;
  }

  try {
    const payload = base64urlDecode(encodedPayload);
    if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}
