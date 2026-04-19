import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getAuthUser } from '@/lib/auth'

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await getAuthUser()
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = await getDb()
  const taskResult = await db.execute({
    sql: 'SELECT * FROM task_templates WHERE id = ?',
    args: [params.id],
  })

  if (!taskResult.rows[0]) {
    return NextResponse.json({ error: 'Task not found' }, { status: 404 })
  }

  const instancesResult = await db.execute({
    sql: `SELECT
            i.*,
            COUNT(a.id) as annotation_count,
            GROUP_CONCAT(a.preference) as preferences
          FROM task_instances i
          LEFT JOIN annotations a ON a.task_instance_id = i.id
          WHERE i.template_id = ?
          GROUP BY i.id
          ORDER BY i.created_at DESC`,
    args: [params.id],
  })

  return NextResponse.json({ task: taskResult.rows[0], instances: instancesResult.rows })
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

    const db = await getDb()
    await db.execute({
      sql: 'UPDATE task_templates SET status = ? WHERE id = ?',
      args: [status, params.id],
    })

    const task = await db.execute({ sql: 'SELECT * FROM task_templates WHERE id = ?', args: [params.id] })
    return NextResponse.json({ task: task.rows[0] })
  } catch (err) {
    console.error('Update task error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
