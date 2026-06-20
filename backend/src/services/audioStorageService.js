import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import env from '../config/env.js';

function resolveDir(dirPath) {
  return path.isAbsolute(dirPath) ? dirPath : path.resolve(process.cwd(), dirPath);
}

function assertInsideBase(baseDir, targetPath) {
  const resolvedBase = path.resolve(baseDir);
  const resolvedTarget = path.resolve(targetPath);
  const relative = path.relative(resolvedBase, resolvedTarget);

  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error('مسیر فایل نامعتبر است.');
  }
}

export function ensureAudioDirectories() {
  const audioDir = resolveDir(env.AUDIO_STORAGE_DIR);
  const voiceDir = resolveDir(env.VOICE_UPLOAD_DIR);

  if (!fs.existsSync(audioDir)) {
    fs.mkdirSync(audioDir, { recursive: true });
  }
  if (!fs.existsSync(voiceDir)) {
    fs.mkdirSync(voiceDir, { recursive: true });
  }

  return { audioDir, voiceDir };
}

export function createSafeAudioFilename(prefix, extension) {
  const safePrefix = String(prefix || 'audio').replace(/[^a-zA-Z0-9_-]/g, '');
  const safeExt = String(extension || 'mp3').replace(/[^a-zA-Z0-9]/g, '');
  const unique = crypto.randomBytes(8).toString('hex');
  return `${safePrefix}-${Date.now()}-${unique}.${safeExt}`;
}

export function getAudioStoragePath(filename) {
  const { audioDir } = ensureAudioDirectories();
  const safeName = path.basename(filename);
  const fullPath = path.join(audioDir, safeName);
  assertInsideBase(audioDir, fullPath);
  return fullPath;
}

export function getVoiceUploadPath(filename) {
  const { voiceDir } = ensureAudioDirectories();
  const safeName = path.basename(filename);
  const fullPath = path.join(voiceDir, safeName);
  assertInsideBase(voiceDir, fullPath);
  return fullPath;
}

export function deleteFileIfExists(filePath) {
  if (!filePath) return false;

  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return true;
    }
  } catch {
    return false;
  }

  return false;
}

export default {
  ensureAudioDirectories,
  createSafeAudioFilename,
  getAudioStoragePath,
  getVoiceUploadPath,
  deleteFileIfExists,
};
