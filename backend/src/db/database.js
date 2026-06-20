import { DatabaseSync } from 'node:sqlite';
import fs from 'fs';
import path from 'path';
import env from '../config/env.js';
import { runMigrations } from './migrate.js';

const dbPath = path.isAbsolute(env.DATABASE_PATH)
  ? env.DATABASE_PATH
  : path.resolve(process.cwd(), env.DATABASE_PATH);

const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = createDatabase(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('synchronous = NORMAL');
db.pragma('foreign_keys = ON');
db.pragma('busy_timeout = 5000');

runMigrations(db);

export function closeDatabase() {
  if (db.open) {
    db.close();
  }
}

export default db;

function createDatabase(filePath) {
  const sqlite = new DatabaseSync(filePath);
  let open = true;

  return {
    get open() {
      return open;
    },
    prepare(sql) {
      return sqlite.prepare(sql);
    },
    exec(sql) {
      return sqlite.exec(sql);
    },
    pragma(setting) {
      sqlite.exec(`PRAGMA ${setting}`);
    },
    transaction(fn) {
      return (...args) => {
        sqlite.exec('BEGIN IMMEDIATE');
        try {
          const result = fn(...args);
          sqlite.exec('COMMIT');
          return result;
        } catch (error) {
          try {
            sqlite.exec('ROLLBACK');
          } catch {
            // ignore rollback errors
          }
          throw error;
        }
      };
    },
    backup(destPath) {
      const normalized = path.resolve(destPath).replace(/\\/g, '/').replace(/'/g, "''");
      sqlite.exec(`VACUUM INTO '${normalized}'`);
      return Promise.resolve();
    },
    close() {
      if (open) {
        sqlite.close();
        open = false;
      }
    },
  };
}
