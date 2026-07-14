import crypto from 'crypto';

export function hashDeviceIdentifier(value) {
  if (!value || typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return crypto.createHash('sha256').update(trimmed).digest('hex');
}

export default hashDeviceIdentifier;
