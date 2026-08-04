import { spawn } from 'child_process';
import fs from 'fs';
import ffmpegStatic from 'ffmpeg-static';
import {
  AUDIO_DURATION_TOLERANCE_SEC,
  getDurationTargets,
} from '../catalog/storyDuration.js';
import { createSafeAudioFilename, getAudioStoragePath } from './audioStorageService.js';
import env from '../config/env.js';

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
        resolve(stderr);
        return;
      }
      reject(new Error(stderr.trim() || `ffmpeg exited with code ${code}`));
    });
  });
}

function getOutputCodecArgs(format) {
  const normalized = String(format || 'mp3').toLowerCase();
  if (normalized === 'mp3') {
    return ['-c:a', 'libmp3lame', '-q:a', '4'];
  }
  if (normalized === 'opus') {
    return ['-c:a', 'libopus'];
  }
  if (normalized === 'aac') {
    return ['-c:a', 'aac', '-b:a', '192k'];
  }
  if (normalized === 'flac') {
    return ['-c:a', 'flac'];
  }
  return ['-c:a', 'pcm_s16le'];
}

/**
 * Probe duration in seconds using ffmpeg stderr metadata.
 */
export async function probeAudioDurationSeconds(audioPath) {
  if (!audioPath || !fs.existsSync(audioPath)) return null;

  try {
    const stderr = await new Promise((resolve, reject) => {
      if (!ffmpegStatic) {
        reject(new Error('ffmpeg در دسترس نیست.'));
        return;
      }
      const processRef = spawn(
        ffmpegStatic,
        ['-i', audioPath, '-f', 'null', '-'],
        { stdio: ['ignore', 'pipe', 'pipe'] },
      );
      let errText = '';
      processRef.stderr.on('data', (chunk) => {
        errText += chunk.toString();
      });
      processRef.on('error', reject);
      processRef.on('close', () => resolve(errText));
    });

    const match = stderr.match(/Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/i);
    if (!match) return null;
    const hours = Number(match[1]);
    const minutes = Number(match[2]);
    const seconds = Number(match[3]);
    const total = hours * 3600 + minutes * 60 + seconds;
    return Number.isFinite(total) && total > 0 ? total : null;
  } catch (err) {
    if (env.isDevelopment || env.LOG_LEVEL === 'debug') {
      console.warn('[audio-duration] probe failed:', err.message);
    }
    return null;
  }
}

/**
 * Build atempo filter chain. Each atempo must be within 0.5–2.0.
 * factor > 1 → faster (shorter); factor < 1 → slower (longer).
 */
export function buildAtempoFilter(factor) {
  let remaining = factor;
  const parts = [];

  // Guard extreme values
  remaining = Math.min(8, Math.max(0.125, remaining));

  while (remaining > 2.0 + 1e-6) {
    parts.push('atempo=2.0');
    remaining /= 2.0;
  }
  while (remaining < 0.5 - 1e-6) {
    parts.push('atempo=0.5');
    remaining /= 0.5;
  }
  parts.push(`atempo=${remaining.toFixed(5)}`);
  return parts.join(',');
}

/**
 * Time-stretch narration so playback length ≈ selected durationMinutes.
 * Returns the (possibly new) audio path and measured duration.
 */
export async function fitAudioToDurationMinutes(audioPath, durationMinutes, format = 'mp3') {
  const { targetSeconds, durationMinutes: minutes } = getDurationTargets(durationMinutes);
  const current = await probeAudioDurationSeconds(audioPath);

  if (!current || !Number.isFinite(current) || current <= 0.05) {
    return {
      audioPath,
      durationSeconds: current,
      targetSeconds,
      adjusted: false,
      durationMinutes: minutes,
    };
  }

  if (Math.abs(current - targetSeconds) <= AUDIO_DURATION_TOLERANCE_SEC) {
    return {
      audioPath,
      durationSeconds: current,
      targetSeconds,
      adjusted: false,
      durationMinutes: minutes,
    };
  }

  const factor = current / targetSeconds;
  const filter = buildAtempoFilter(factor);
  const normalizedFormat = String(format || 'mp3').toLowerCase();
  const outFilename = createSafeAudioFilename('story-timed', normalizedFormat);
  const outputPath = getAudioStoragePath(outFilename);

  try {
    await runFfmpeg([
      '-y',
      '-i',
      audioPath,
      '-filter:a',
      filter,
      ...getOutputCodecArgs(normalizedFormat),
      outputPath,
    ]);
  } catch (err) {
    if (env.isDevelopment || env.LOG_LEVEL === 'debug') {
      console.warn('[audio-duration] fit failed:', err.message);
    }
    return {
      audioPath,
      durationSeconds: current,
      targetSeconds,
      adjusted: false,
      durationMinutes: minutes,
      error: err.message,
    };
  }

  const fitted = await probeAudioDurationSeconds(outputPath);
  try {
    if (audioPath !== outputPath && fs.existsSync(audioPath)) {
      fs.unlinkSync(audioPath);
    }
  } catch {
    /* ignore cleanup errors */
  }

  if (env.isDevelopment || env.LOG_LEVEL === 'debug') {
    console.info(
      '[audio-duration]',
      `${current.toFixed(1)}s → ${(fitted || 0).toFixed(1)}s`,
      `(target ${targetSeconds}s, ${minutes} min)`,
    );
  }

  return {
    audioPath: outputPath,
    durationSeconds: fitted || targetSeconds,
    targetSeconds,
    adjusted: true,
    durationMinutes: minutes,
  };
}

export default {
  probeAudioDurationSeconds,
  buildAtempoFilter,
  fitAudioToDurationMinutes,
};
