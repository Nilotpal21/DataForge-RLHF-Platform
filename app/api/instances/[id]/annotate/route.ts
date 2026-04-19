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

  const db = await getDb()
  const result = await db.execute({
    sql: `SELECT i.*, t.name as task_name, t.task_type, t.rubric_config, t.parameters
          FROM task_instances i
          JOIN task_templates t ON t.id = i.template_id
          WHERE i.id = ?`,
    args: [params.id],
  })

  if (!result.rows[0]) {
    return NextResponse.json({ error: 'Instance not found' }, { status: 404 })
  }

  return NextResponse.json({ instance: result.rows[0] })
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

    const db = await getDb()

    const instanceResult = await db.execute({
      sql: `SELECT i.*, t.parameters FROM task_instances i
            JOIN task_templates t ON t.id = i.template_id WHERE i.id = ?`,
      args: [params.id],
    })

    if (!instanceResult.rows[0]) {
      return NextResponse.json({ error: 'Instance not found' }, { status: 404 })
    }

    const existing = await db.execute({
      sql: 'SELECT id FROM annotations WHERE task_instance_id = ? AND annotator_id = ?',
      args: [params.id, auth.userId],
    })
    if (existing.rows[0]) {
      return NextResponse.json({ error: 'Already annotated' }, { status: 409 })
    }

    const result = await db.execute({
      sql: `INSERT INTO annotations
              (task_instance_id, annotator_id, preference, preference_strength, ratings, rationale, status)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [
        params.id,
        auth.userId,
        preference,
        preference_strength || null,
        ratings ? JSON.stringify(ratings) : null,
        cleanRationale || null,
        'submitted',
      ],
    })

    const instance = instanceResult.rows[0] as unknown as { parameters: string }
    const paramsConfig = instance.parameters ? JSON.parse(String(instance.parameters)) : {}
    const requiredAnnotations = paramsConfig.annotationsPerTask || 1

    const countResult = await db.execute({
      sql: 'SELECT COUNT(*) as c FROM annotations WHERE task_instance_id = ?',
      args: [params.id],
    })
    const count = Number(countResult.rows[0].c)

    if (count >= requiredAnnotations) {
      await db.execute({
        sql: 'UPDATE task_instances SET status = ? WHERE id = ?',
        args: ['completed', params.id],
      })
    }

    const annotation = await db.execute({
      sql: 'SELECT * FROM annotations WHERE id = ?',
      args: [Number(result.lastInsertRowid)],
    })
    return NextResponse.json({ annotation: annotation.rows[0] }, { status: 201 })
  } catch (err) {
    console.error('Annotate error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
