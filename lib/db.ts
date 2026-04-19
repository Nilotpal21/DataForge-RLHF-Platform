import { createClient, type Client } from '@libsql/client'
import bcrypt from 'bcryptjs'

let _client: Client | null = null
let _initialized = false
let _initPromise: Promise<void> | null = null

function getClient(): Client {
  if (!_client) {
    _client = createClient({
      url: process.env.TURSO_DATABASE_URL || 'file:local.db',
      authToken: process.env.TURSO_AUTH_TOKEN || undefined,
    })
  }
  return _client
}

export async function getDb(): Promise<Client> {
  const db = getClient()
  if (!_initialized) {
    if (!_initPromise) {
      _initPromise = initSchema(db)
        .then(() => seedData(db))
        .then(() => { _initialized = true })
        .catch(err => {
          _initPromise = null
          throw err
        })
    }
    await _initPromise
  }
  return db
}

async function initSchema(db: Client) {
  await db.executeMultiple(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL,
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

async function seedData(db: Client) {
  const res = await db.execute('SELECT COUNT(*) as c FROM users')
  if (Number(res.rows[0].c) > 0) return

  const hash = (pw: string) => bcrypt.hashSync(pw, 10)

  await db.batch([
    { sql: 'INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)', args: ['admin@dataforge.ai', hash('admin123'), 'admin'] },
    { sql: 'INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)', args: ['annotator@dataforge.ai', hash('annotator123'), 'annotator'] },
    { sql: 'INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)', args: ['qa@dataforge.ai', hash('qa123'), 'qa'] },
  ], 'write')

  const adminRes = await db.execute({ sql: 'SELECT id FROM users WHERE email = ?', args: ['admin@dataforge.ai'] })
  const adminId = adminRes.rows[0].id

  const taskRes = await db.execute({
    sql: `INSERT INTO task_templates (name, description, task_type, rubric_config, parameters, status, created_by)
          VALUES (?, ?, ?, ?, ?, ?, ?)`,
    args: [
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
      adminId,
    ],
  })

  const taskId = Number(taskRes.lastInsertRowid)

  await db.batch([
    {
      sql: 'INSERT INTO task_instances (template_id, prompt, responses, status) VALUES (?, ?, ?, ?)',
      args: [
        taskId,
        'Explain the concept of machine learning to a 10-year-old child.',
        JSON.stringify([
          "Machine learning is like teaching a dog new tricks, but for computers! Instead of a dog, we have a computer program, and instead of treats, we use lots of examples. We show the computer thousands of pictures of cats and dogs, and after a while, it learns to tell them apart on its own. It finds patterns in the examples, just like you learned to recognize letters by seeing them many times.",
          "Machine learning is a subset of artificial intelligence that enables systems to automatically learn and improve from experience without being explicitly programmed. It focuses on developing computer programs that can access data and use it to learn for themselves. The process begins with observations or data, such as examples, direct experience, or instruction, to look for patterns in data and make better decisions in the future.",
        ]),
        'pending',
      ],
    },
    {
      sql: 'INSERT INTO task_instances (template_id, prompt, responses, status) VALUES (?, ?, ?, ?)',
      args: [
        taskId,
        'Write a short poem about autumn.',
        JSON.stringify([
          "Golden leaves cascade and fall,\nWhispers of the seasons call,\nCrisp air dancing, cool and bright,\nAutumn paints the world tonight.",
          "Autumn comes with colors bright,\nRed and yellow, what a sight,\nLeaves are falling to the ground,\nCrunchy footsteps all around.",
        ]),
        'pending',
      ],
    },
  ], 'write')
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
