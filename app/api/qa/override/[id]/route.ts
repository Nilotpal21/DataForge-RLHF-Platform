import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getAuthUser } from '@/lib/auth'
import { sanitize } from '@/lib/sanitize'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await getAuthUser()
  if (!auth || auth.role !== 'qa') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const { preference, preference_strength, rationale, justification } = body

    if (!preference || !justification) {
      return NextResponse.json({ error: 'preference and justification are required' }, { status: 400 })
    }

    const { value: cleanRationale } = rationale ? sanitize(rationale) : { value: '' }
    const { value: cleanJustification } = sanitize(justification)

    const db = await getDb()

    const instanceCheck = await db.execute({
      sql: 'SELECT id FROM task_instances WHERE id = ?',
      args: [params.id],
    })
    if (!instanceCheck.rows[0]) {
      return NextResponse.json({ error: 'Instance not found' }, { status: 404 })
    }

    await db.execute({
      sql: 'UPDATE annotations SET status = ? WHERE task_instance_id = ? AND is_override = 0',
      args: ['overridden', params.id],
    })

    const result = await db.execute({
      sql: `INSERT INTO annotations
              (task_instance_id, annotator_id, preference, preference_strength,
               rationale, is_override, override_justification, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        params.id,
        auth.userId,
        preference,
        preference_strength || null,
        cleanRationale || null,
        1,
        cleanJustification,
        'submitted',
      ],
    })

    const annotation = await db.execute({
      sql: 'SELECT * FROM annotations WHERE id = ?',
      args: [Number(result.lastInsertRowid)],
    })
    return NextResponse.json({ annotation: annotation.rows[0] }, { status: 201 })
  } catch (err) {
    console.error('Override error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
