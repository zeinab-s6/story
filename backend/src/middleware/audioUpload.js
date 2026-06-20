import multer from 'multer';
import path from 'path';
import env from '../config/env.js';
import {
  createSafeAudioFilename,
  ensureAudioDirectories,
  getVoiceUploadPath,
} from '../services/audioStorageService.js';

const ALLOWED_MIME_TYPES = new Set([
  'audio/mpeg',
  'audio/wav',
  'audio/ogg',
  'audio/aac',
  'audio/flac',
  'audio/webm',
  'audio/mp4',
  'audio/x-wav',
  'audio/wave',
]);

const MIME_TO_EXT = {
  'audio/mpeg': 'mp3',
  'audio/wav': 'wav',
  'audio/x-wav': 'wav',
  'audio/wave': 'wav',
  'audio/ogg': 'ogg',
  'audio/aac': 'aac',
  'audio/flac': 'flac',
  'audio/webm': 'webm',
  'audio/mp4': 'm4a',
};

function getExtension(mimetype, originalname) {
  if (MIME_TO_EXT[mimetype]) {
    return MIME_TO_EXT[mimetype];
  }

  const ext = path.extname(originalname || '').replace('.', '').toLowerCase();
  return ext || 'bin';
}

const storage = multer.diskStorage({
  destination(_req, _file, cb) {
    try {
      const { voiceDir } = ensureAudioDirectories();
      cb(null, voiceDir);
    } catch (err) {
      cb(err);
    }
  },
  filename(_req, file, cb) {
    const prefix = file.fieldname === 'consentAudio' ? 'consent' : 'sample';
    const extension = getExtension(file.mimetype, file.originalname);
    cb(null, createSafeAudioFilename(prefix, extension));
  },
});

function fileFilter(_req, file, cb) {
  if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
    const error = new Error('فقط فایل‌های صوتی مجاز هستند.');
    error.statusCode = 400;
    return cb(error);
  }
  return cb(null, true);
}

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: env.MAX_AUDIO_UPLOAD_MB * 1024 * 1024,
  },
});

export const voiceProfileUpload = upload.fields([
  { name: 'consentAudio', maxCount: 1 },
  { name: 'sampleAudio', maxCount: 1 },
]);

export function mapUploadedVoiceFiles(files) {
  const consentFile = files?.consentAudio?.[0];
  const sampleFile = files?.sampleAudio?.[0];

  return {
    consentAudioPath: consentFile ? getVoiceUploadPath(consentFile.filename) : null,
    sampleAudioPath: sampleFile ? getVoiceUploadPath(sampleFile.filename) : null,
  };
}

export function handleMulterError(err, _req, res, next) {
  if (!err) return next();

  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      success: false,
      error: `حجم فایل صوتی نباید بیشتر از ${env.MAX_AUDIO_UPLOAD_MB} مگابایت باشد.`,
    });
  }

  if (err.statusCode === 400 || err.message) {
    return res.status(err.statusCode || 400).json({
      success: false,
      error: err.message || 'خطا در آپلود فایل صوتی.',
    });
  }

  return next(err);
}

export default voiceProfileUpload;
