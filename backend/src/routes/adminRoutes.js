import { Router } from 'express';
import { adminAuth } from '../middleware/adminAuth.js';
import { createBackup } from '../services/backupService.js';
import { getStoryStats } from '../repositories/storyRepository.js';

const router = Router();

router.use(adminAuth);

router.post('/backups', async (_req, res, next) => {
  try {
    const backupPath = await createBackup();
    res.status(201).json({
      success: true,
      backupPath,
      message: 'پشتیبان‌گیری با موفقیت انجام شد.',
    });
  } catch (err) {
    next(err);
  }
});

router.get('/stats', (_req, res) => {
  const stats = getStoryStats();
  res.json({ success: true, stats });
});

export default router;
