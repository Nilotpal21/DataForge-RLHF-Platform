import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getAuthUser } from '@/lib/auth'
import { sanitize } from '@/lib/sanitize'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await getAuthUser()
  if (!auth || auth.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const { prompt, responses } = body

    if (!prompt || !responses || !Array.isArray(responses)) {
      return NextResponse.json({ error: 'prompt and responses[] are required' }, { status: 400 })
    }

    const { value: cleanPrompt } = sanitize(prompt)
    const cleanResponses = responses.map((r: string) => sanitize(r).value)

    const db = await getDb()

    const taskCheck = await db.execute({
      sql: 'SELECT id FROM task_templates WHERE id = ?',
      args: [params.id],
    })
    if (!taskCheck.rows[0]) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    const result = await db.execute({
      sql: 'INSERT INTO task_instances (template_id, prompt, responses, status) VALUES (?, ?, ?, ?)',
      args: [params.id, cleanPrompt, JSON.stringify(cleanResponses), 'pending'],
    })

    const instance = await db.execute({
      sql: 'SELECT * FROM task_instances WHERE id = ?',
      args: [Number(result.lastInsertRowid)],
    })
    return NextResponse.json({ instance: instance.rows[0] }, { status: 201 })
  } catch (err) {
    console.error('Create instance error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
