import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getAuthUser } from '@/lib/auth'

export async function GET(request: NextRequest) {
  const auth = await getAuthUser()
  if (!auth || auth.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const taskId = searchParams.get('task_id')
  const format = searchParams.get('format') || 'jsonl'

  if (!taskId) {
    return NextResponse.json({ error: 'task_id is required' }, { status: 400 })
  }

  const db = await getDb()
  const result = await db.execute({
    sql: `SELECT
            a.*,
            i.prompt,
            i.responses,
            i.template_id as task_id,
            u.email as annotator_email
          FROM annotations a
          JOIN task_instances i ON i.id = a.task_instance_id
          JOIN users u ON u.id = a.annotator_id
          WHERE i.template_id = ? AND a.status = 'submitted'
          ORDER BY a.created_at ASC`,
    args: [taskId],
  })

  type Row = {
    id: unknown; task_instance_id: unknown; annotator_id: unknown
    annotator_email: unknown; preference: unknown; preference_strength: unknown
    ratings: unknown; rationale: unknown; prompt: unknown; responses: unknown
    task_id: unknown; created_at: unknown
  }

  const annotations = result.rows as unknown as Row[]

  if (format === 'anthropic') {
    const lines = annotations
      .filter(a => a.preference === 'A' || a.preference === 'B')
      .map(a => {
        const responses: string[] = JSON.parse(String(a.responses || '[]'))
        const chosen = a.preference === 'A' ? responses[0] : responses[1]
        const rejected = a.preference === 'A' ? responses[1] : responses[0]
        return JSON.stringify({ prompt: a.prompt, chosen, rejected })
      })

    return new NextResponse(lines.join('\n'), {
      headers: {
        'Content-Type': 'application/x-ndjson',
        'Content-Disposition': `attachment; filename="task_${taskId}_anthropic.jsonl"`,
      },
    })
  }

  const lines = annotations.map(a => {
    const responses: string[] = JSON.parse(String(a.responses || '[]'))
    const chosen = a.preference === 'A' ? responses[0] : a.preference === 'B' ? responses[1] : null
    const rejected = a.preference === 'A' ? responses[1] : a.preference === 'B' ? responses[0] : null
    return JSON.stringify({
      prompt: a.prompt,
      chosen,
      rejected,
      preference: a.preference,
      preference_strength: a.preference_strength,
      rationale: a.rationale,
      ratings: a.ratings ? JSON.parse(String(a.ratings)) : null,
      annotator_id: a.annotator_id,
      task_id: a.task_id,
      annotation_id: a.id,
      timestamp: a.created_at,
    })
  })

  return new NextResponse(lines.join('\n'), {
    headers: {
      'Content-Type': 'application/x-ndjson',
      'Content-Disposition': `attachment; filename="task_${taskId}_export.jsonl"`,
    },
  })
}
