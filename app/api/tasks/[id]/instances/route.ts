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

    const db = getDb()

    // Verify task exists
    const task = db.prepare('SELECT id FROM task_templates WHERE id = ?').get(params.id)
    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    const result = db.prepare(`
      INSERT INTO task_instances (template_id, prompt, responses, status)
      VALUES (?, ?, ?, ?)
    `).run(params.id, cleanPrompt, JSON.stringify(cleanResponses), 'pending')

    const instance = db.prepare('SELECT * FROM task_instances WHERE id = ?').get(result.lastInsertRowid)
    return NextResponse.json({ instance }, { status: 201 })
  } catch (err) {
    console.error('Create instance error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
