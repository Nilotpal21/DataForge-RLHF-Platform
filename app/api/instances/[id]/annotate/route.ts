import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getAuthUser } from '@/lib/auth'
import { sanitize } from '@/lib/sanitize'

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await getAuthUser()
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = getDb()

  const instance = db.prepare(`
    SELECT i.*, t.name as task_name, t.task_type, t.rubric_config, t.parameters
    FROM task_instances i
    JOIN task_templates t ON t.id = i.template_id
    WHERE i.id = ?
  `).get(params.id)

  if (!instance) {
    return NextResponse.json({ error: 'Instance not found' }, { status: 404 })
  }

  return NextResponse.json({ instance })
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await getAuthUser()
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json()
    const { preference, preference_strength, ratings, rationale } = body

    if (!preference) {
      return NextResponse.json({ error: 'preference is required' }, { status: 400 })
    }

    const { value: cleanRationale } = rationale ? sanitize(rationale) : { value: '' }

    const db = getDb()

    // Check instance exists
    const instance = db.prepare(`
      SELECT i.*, t.parameters
      FROM task_instances i
      JOIN task_templates t ON t.id = i.template_id
      WHERE i.id = ?
    `).get(params.id) as { id: number; parameters: string } | undefined

    if (!instance) {
      return NextResponse.json({ error: 'Instance not found' }, { status: 404 })
    }

    // Check for duplicate annotation
    const existing = db.prepare(
      'SELECT id FROM annotations WHERE task_instance_id = ? AND annotator_id = ?'
    ).get(params.id, auth.userId)

    if (existing) {
      return NextResponse.json({ error: 'Already annotated' }, { status: 409 })
    }

    const result = db.prepare(`
      INSERT INTO annotations (task_instance_id, annotator_id, preference, preference_strength, ratings, rationale, status)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      params.id,
      auth.userId,
      preference,
      preference_strength || null,
      ratings ? JSON.stringify(ratings) : null,
      cleanRationale || null,
      'submitted'
    )

    // Check if we should update instance status based on required annotations
    const params_config = instance.parameters ? JSON.parse(instance.parameters) : {}
    const requiredAnnotations = params_config.annotationsPerTask || 1

    const annotationCount = (db.prepare(
      'SELECT COUNT(*) as c FROM annotations WHERE task_instance_id = ?'
    ).get(params.id) as { c: number }).c

    if (annotationCount >= requiredAnnotations) {
      db.prepare('UPDATE task_instances SET status = ? WHERE id = ?').run('completed', params.id)
    }

    const annotation = db.prepare('SELECT * FROM annotations WHERE id = ?').get(result.lastInsertRowid)
    return NextResponse.json({ annotation }, { status: 201 })
  } catch (err) {
    console.error('Annotate error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
