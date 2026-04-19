import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getAuthUser } from '@/lib/auth'

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await getAuthUser()
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = getDb()
  const task = db.prepare('SELECT * FROM task_templates WHERE id = ?').get(params.id)

  if (!task) {
    return NextResponse.json({ error: 'Task not found' }, { status: 404 })
  }

  const instances = db.prepare(`
    SELECT
      i.*,
      COUNT(a.id) as annotation_count,
      GROUP_CONCAT(a.preference) as preferences
    FROM task_instances i
    LEFT JOIN annotations a ON a.task_instance_id = i.id
    WHERE i.template_id = ?
    GROUP BY i.id
    ORDER BY i.created_at DESC
  `).all(params.id)

  return NextResponse.json({ task, instances })
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await getAuthUser()
  if (!auth || auth.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const { status } = body

    const db = getDb()
    db.prepare('UPDATE task_templates SET status = ? WHERE id = ?').run(status, params.id)

    const task = db.prepare('SELECT * FROM task_templates WHERE id = ?').get(params.id)
    return NextResponse.json({ task })
  } catch (err) {
    console.error('Update task error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
