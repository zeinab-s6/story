import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

const COLUMN_ADDITIONS = [
  { table: 'stories', column: 'session_id', ddl: 'TEXT' },
  { table: 'stories', column: 'extra_context', ddl: 'TEXT' },
  { table: 'stories', column: 'model', ddl: 'TEXT' },
  { table: 'stories', column: 'prompt_version', ddl: "TEXT NOT NULL DEFAULT 'v1.0.0'" },
  { table: 'stories', column: 'safety_reason', ddl: 'TEXT' },
  { table: 'stories', column: 'user_id', ddl: 'INTEGER REFERENCES users(id)' },
];

function columnExists(db, table, column) {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all();
  return columns.some((c) => c.name === column);
}

function tableExists(db, table) {
  const row = db
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?")
    .get(table);
  return Boolean(row);
}

function ensureColumns(db) {
  for (const { table, column, ddl } of COLUMN_ADDITIONS) {
    if (!tableExists(db, table)) continue;
    if (!columnExists(db, table, column)) {
      db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${ddl}`);
    }
  }
}

function getAppliedMigrations(db) {
  if (!tableExists(db, '_migrations')) {
    return new Set();
  }
  const rows = db.prepare('SELECT name FROM _migrations').all();
  return new Set(rows.map((r) => r.name));
}

function getMigrationFiles() {
  if (!fs.existsSync(MIGRATIONS_DIR)) return [];
  return fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort();
}

function applyMigration(db, name, sql) {
  const applied = getAppliedMigrations(db);
  if (applied.has(name)) return;

  const run = db.transaction(() => {
    db.exec(sql);
    db.prepare('INSERT INTO _migrations (name, applied_at) VALUES (?, ?)').run(
      name,
      new Date().toISOString(),
    );
  });

  run();
}

export function runMigrations(db) {
  const files = getMigrationFiles().filter((f) => f !== '004_indexes.sql');

  for (const file of files) {
    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
    applyMigration(db, file, sql);
  }

  const ensureName = '003_ensure_columns';
  const applied = getAppliedMigrations(db);
  if (!applied.has(ensureName)) {
    const run = db.transaction(() => {
      ensureColumns(db);
      db.prepare('INSERT INTO _migrations (name, applied_at) VALUES (?, ?)').run(
        ensureName,
        new Date().toISOString(),
      );
    });
    run();
  }

  const indexesFile = '004_indexes.sql';
  if (fs.existsSync(path.join(MIGRATIONS_DIR, indexesFile))) {
    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, indexesFile), 'utf8');
    applyMigration(db, indexesFile, sql);
  }
}

export default runMigrations;
