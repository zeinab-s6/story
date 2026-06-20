import { Router } from 'express';
import { validateFeedbackInput } from '../validators/feedbackValidator.js';
import { saveFeedback } from '../repositories/feedbackRepository.js';
import env from '../config/env.js';

const router = Router();

router.post('/:storyId', (req, res) => {
  const storyId = Number(req.params.storyId);

  if (!Number.isInteger(storyId) || storyId <= 0) {
    return res.status(400).json({
      success: false,
      error: 'شناسه قصه معتبر نیست.',
    });
  }

  const validation = validateFeedbackInput(req.body);

  if (!validation.valid) {
    return res.status(400).json({
      success: false,
      error: validation.errors[0],
      ...(env.isDevelopment && { details: validation.errors.join(' | ') }),
    });
  }

  const feedbackId = saveFeedback(
    storyId,
    validation.data.rating,
    validation.data.note,
  );

  if (!feedbackId) {
    return res.status(404).json({
      success: false,
      error: 'قصه‌ای با این شناسه پیدا نشد.',
    });
  }

  return res.status(201).json({
    success: true,
    feedbackId,
    message: 'بازخورد شما ثبت شد. ممنونیم!',
  });
});

export default router;
