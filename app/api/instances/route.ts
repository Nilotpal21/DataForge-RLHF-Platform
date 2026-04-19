import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getAuthUser } from '@/lib/auth'

export async function GET() {
  const auth = await getAuthUser()
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = getDb()

  // Get published task instances that haven't been annotated by this user
  const instances = db.prepare(`
    SELECT
      i.*,
      t.name as task_name,
      t.task_type,
      t.rubric_config,
      t.parameters,
      COUNT(a.id) as annotation_count
    FROM task_instances i
    JOIN task_templates t ON t.id = i.template_id
    LEFT JOIN annotations a ON a.task_instance_id = i.id AND a.annotator_id = ?
    WHERE t.status = 'published'
      AND i.status = 'pending'
      AND a.id IS NULL
    GROUP BY i.id
    ORDER BY i.created_at ASC
  `).all(auth.userId)

  return NextResponse.json({ instances })
}
