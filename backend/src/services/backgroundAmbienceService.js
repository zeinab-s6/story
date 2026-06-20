import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import ffmpegStatic from 'ffmpeg-static';
import env from '../config/env.js';
import { createSafeAudioFilename, getAudioStoragePath } from './audioStorageService.js';

function resolveBackgroundAudioPath() {
  const configured = env.STORY_BACKGROUND_AUDIO_PATH?.trim();
  if (configured) {
    return path.isAbsolute(configured)
      ? configured
      : path.resolve(process.cwd(), configured);
  }

  return path.resolve(process.cwd(), '../frontend/images/audio/source.mp3');
}

export function getBackgroundAudioPath() {
  return resolveBackgroundAudioPath();
}

export function isBackgroundAudioAvailable() {
  return fs.existsSync(getBackgroundAudioPath());
}

function runFfmpeg(args) {
  if (!ffmpegStatic) {
    return Promise.reject(new Error('ffmpeg در دسترس نیست.'));
  }

  return new Promise((resolve, reject) => {
    const processRef = spawn(ffmpegStatic, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stderr = '';

    processRef.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    processRef.on('error', reject);
    processRef.on('close', (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(stderr.trim() || `ffmpeg exited with code ${code}`));
    });
  });
}

function getOutputCodecArgs(format) {
  if (format === 'mp3') {
    return ['-c:a', 'libmp3lame', '-q:a', '4'];
  }
  if (format === 'opus') {
    return ['-c:a', 'libopus'];
  }
  if (format === 'aac') {
    return ['-c:a', 'aac', '-b:a', '192k'];
  }
  if (format === 'flac') {
    return ['-c:a', 'flac'];
  }
  return ['-c:a', 'pcm_s16le'];
}

export async function mixNarrationWithBackgroundAmbience({
  narrationPath,
  format = 'wav',
  backgroundVolume = env.STORY_BACKGROUND_VOLUME,
}) {
  const backgroundPath = getBackgroundAudioPath();
  if (!fs.existsSync(backgroundPath)) {
    throw new Error('فایل صدای پس‌زمینه آرام پیدا نشد.');
  }

  const normalizedFormat = String(format || 'wav').toLowerCase();
  const mixedFilename = createSafeAudioFilename('story-mixed', normalizedFormat);
  const outputPath = getAudioStoragePath(mixedFilename);
  const volume = Math.min(1, Math.max(0, Number(backgroundVolume) || 0.14));
  const filter = `[1:a]volume=${volume}[bg];[0:a][bg]amix=inputs=2:duration=first:dropout_transition=2`;

  await runFfmpeg([
    '-y',
    '-i',
    narrationPath,
    '-stream_loop',
    '-1',
    '-i',
    backgroundPath,
    '-filter_complex',
    filter,
    ...getOutputCodecArgs(normalizedFormat),
    outputPath,
  ]);

  return outputPath;
}

export default {
  getBackgroundAudioPath,
  isBackgroundAudioAvailable,
  mixNarrationWithBackgroundAmbience,
};
