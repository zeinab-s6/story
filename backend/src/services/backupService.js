import fs from 'fs';
import path from 'path';
import env from '../config/env.js';
import db from '../db/database.js';

function formatBackupFilename() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return [
    'storytelling',
    now.getFullYear(),
    pad(now.getMonth() + 1),
    pad(now.getDate()),
    pad(now.getHours()),
    pad(now.getMinutes()),
  ].join('-') + '.sqlite';
}

export async function createBackup() {
  const backupDir = path.isAbsolute(env.BACKUP_DIR)
    ? env.BACKUP_DIR
    : path.resolve(process.cwd(), env.BACKUP_DIR);

  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const filename = formatBackupFilename();
  const backupPath = path.join(backupDir, filename);

  await db.backup(backupPath);

  return backupPath;
}

export default createBackup;
