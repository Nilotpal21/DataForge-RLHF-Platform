import Database from 'better-sqlite3'
import bcrypt from 'bcryptjs'
import path from 'path'

const DB_PATH = process.env.DB_PATH || './dataforge.db'

let db: Database.Database | null = null

export function getDb(): Database.Database {
  if (db) return db
  db = new Database(path.resolve(process.cwd(), DB_PATH))
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  initSchema(db)
  seedData(db)
  return db
}

function initSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('admin','annotator','qa')),
      quality_score REAL DEFAULT 1.0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS task_templates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      task_type TEXT NOT NULL,
      rubric_config TEXT,
      parameters TEXT,
      status TEXT DEFAULT 'draft',
      created_by INTEGER REFERENCES users(id),
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS task_instances (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      template_id INTEGER REFERENCES task_templates(id),
      prompt TEXT NOT NULL,
      responses TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      is_calibration INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS annotations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_instance_id INTEGER REFERENCES task_instances(id),
      annotator_id INTEGER REFERENCES users(id),
      preference TEXT,
      preference_strength TEXT,
      ratings TEXT,
      rationale TEXT,
      is_override INTEGER DEFAULT 0,
      override_justification TEXT,
      status TEXT DEFAULT 'submitted',
      created_at TEXT DEFAULT (datetime('now'))
    );
  `)
}

function seedData(db: Database.Database) {
  const count = db.prepare('SELECT COUNT(*) as c FROM users').get() as { c: number }
  if (count.c > 0) return

  const hash = (pw: string) => bcrypt.hashSync(pw, 10)

  const insert = db.prepare(
    'INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)'
  )

  insert.run('admin@dataforge.ai', hash('admin123'), 'admin')
  insert.run('annotator@dataforge.ai', hash('annotator123'), 'annotator')
  insert.run('qa@dataforge.ai', hash('qa123'), 'qa')

  // Seed a sample task template
  const adminUser = db.prepare('SELECT id FROM users WHERE email = ?').get('admin@dataforge.ai') as { id: number }

  const taskId = (db.prepare(`
    INSERT INTO task_templates (name, description, task_type, rubric_config, parameters, status, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    'Sample Instruction Following Task',
    'Evaluate which response better follows the given instruction.',
    'Side-by-Side Binary',
    JSON.stringify([
      { name: 'Instruction Following', scale: 5 },
      { name: 'Helpfulness', scale: 5 },
      { name: 'Conciseness', scale: 5 },
    ]),
    JSON.stringify({
      annotationsPerTask: 2,
      rationaleRequired: 'required',
      randomizeOrder: true,
      annotatorTier: 'standard',
    }),
    'published',
    adminUser.id
  )).lastInsertRowid

  // Seed sample instances
  const instInsert = db.prepare(`
    INSERT INTO task_instances (template_id, prompt, responses, status)
    VALUES (?, ?, ?, ?)
  `)

  instInsert.run(
    taskId,
    'Explain the concept of machine learning to a 10-year-old child.',
    JSON.stringify([
      "Machine learning is like teaching a dog new tricks, but for computers! Instead of a dog, we have a computer program, and instead of treats, we use lots of examples. We show the computer thousands of pictures of cats and dogs, and after a while, it learns to tell them apart on its own. It finds patterns in the examples, just like you learned to recognize letters by seeing them many times.",
      "Machine learning is a subset of artificial intelligence that enables systems to automatically learn and improve from experience without being explicitly programmed. It focuses on developing computer programs that can access data and use it to learn for themselves. The process begins with observations or data, such as examples, direct experience, or instruction, to look for patterns in data and make better decisions in the future.",
    ]),
    'pending'
  )

  instInsert.run(
    taskId,
    'Write a short poem about autumn.',
    JSON.stringify([
      "Golden leaves cascade and fall,\nWhispers of the seasons call,\nCrisp air dancing, cool and bright,\nAutumn paints the world tonight.",
      "Autumn comes with colors bright,\nRed and yellow, what a sight,\nLeaves are falling to the ground,\nCrunchy footsteps all around.",
    ]),
    'pending'
  )
}

export type User = {
  id: number
  email: string
  role: 'admin' | 'annotator' | 'qa'
  quality_score: number
  created_at: string
}

export type TaskTemplate = {
  id: number
  name: string
  description: string
  task_type: string
  rubric_config: string | null
  parameters: string | null
  status: string
  created_by: number
  created_at: string
}

export type TaskInstance = {
  id: number
  template_id: number
  prompt: string
  responses: string
  status: string
  is_calibration: number
  created_at: string
}

export type Annotation = {
  id: number
  task_instance_id: number
  annotator_id: number
  preference: string | null
  preference_strength: string | null
  ratings: string | null
  rationale: string | null
  is_override: number
  override_justification: string | null
  status: string
  created_at: string
}
