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

    const db = getDb()

    // Check instance exists
    const instance = db.prepare('SELECT id FROM task_instances WHERE id = ?').get(params.id)
    if (!instance) {
      return NextResponse.json({ error: 'Instance not found' }, { status: 404 })
    }

    // Mark existing annotations as overridden
    db.prepare(
      'UPDATE annotations SET status = ? WHERE task_instance_id = ? AND is_override = 0'
    ).run('overridden', params.id)

    // Create override annotation
    const result = db.prepare(`
      INSERT INTO annotations (task_instance_id, annotator_id, preference, preference_strength, rationale, is_override, override_justification, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      params.id,
      auth.userId,
      preference,
      preference_strength || null,
      cleanRationale || null,
      1,
      cleanJustification,
      'submitted'
    )

    const annotation = db.prepare('SELECT * FROM annotations WHERE id = ?').get(result.lastInsertRowid)
    return NextResponse.json({ annotation }, { status: 201 })
  } catch (err) {
    console.error('Override error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
