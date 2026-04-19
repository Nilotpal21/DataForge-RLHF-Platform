import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getAuthUser } from '@/lib/auth'
import { sanitize } from '@/lib/sanitize'

export async function GET() {
  const auth = await getAuthUser()
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = await getDb()
  const result = await db.execute(`
    SELECT
      t.*,
      COUNT(DISTINCT i.id) as instance_count,
      COUNT(DISTINCT a.id) as annotation_count
    FROM task_templates t
    LEFT JOIN task_instances i ON i.template_id = t.id
    LEFT JOIN annotations a ON a.task_instance_id = i.id
    GROUP BY t.id
    ORDER BY t.created_at DESC
  `)

  return NextResponse.json({ tasks: result.rows })
}

export async function POST(request: NextRequest) {
  const auth = await getAuthUser()
  if (!auth || auth.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const { name, description, task_type, rubric_config, parameters, status, instances } = body

    const { value: cleanName } = sanitize(name || '')
    const { value: cleanDesc } = sanitize(description || '')

    if (!cleanName || !task_type) {
      return NextResponse.json({ error: 'Name and task_type are required' }, { status: 400 })
    }

    const db = await getDb()

    const taskResult = await db.execute({
      sql: `INSERT INTO task_templates (name, description, task_type, rubric_config, parameters, status, created_by)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [
        cleanName,
        cleanDesc,
        task_type,
        rubric_config ? JSON.stringify(rubric_config) : null,
        parameters ? JSON.stringify(parameters) : null,
        status || 'draft',
        auth.userId,
      ],
    })

    const taskId = Number(taskResult.lastInsertRowid)

    if (instances && Array.isArray(instances)) {
      for (const inst of instances) {
        const { value: cleanPrompt } = sanitize(inst.prompt || '')
        const cleanResponses = (inst.responses || []).map((r: string) => sanitize(r).value)
        await db.execute({
          sql: 'INSERT INTO task_instances (template_id, prompt, responses, status) VALUES (?, ?, ?, ?)',
          args: [taskId, cleanPrompt, JSON.stringify(cleanResponses), 'pending'],
        })
      }
    }

    const task = await db.execute({ sql: 'SELECT * FROM task_templates WHERE id = ?', args: [taskId] })
    return NextResponse.json({ task: task.rows[0] }, { status: 201 })
  } catch (err) {
    console.error('Create task error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
