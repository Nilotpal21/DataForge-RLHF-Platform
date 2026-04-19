import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getAuthUser } from '@/lib/auth'

export async function GET() {
  const auth = await getAuthUser()
  if (!auth || auth.role !== 'qa') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const db = getDb()

  // Get task instances with multiple annotations (potential disagreements) or flagged ones
  const instances = db.prepare(`
    SELECT
      i.*,
      t.name as task_name,
      t.task_type,
      t.rubric_config,
      COUNT(a.id) as annotation_count,
      GROUP_CONCAT(a.preference) as preferences,
      CASE
        WHEN COUNT(DISTINCT a.preference) > 1 THEN 1
        ELSE 0
      END as has_disagreement
    FROM task_instances i
    JOIN task_templates t ON t.id = i.template_id
    LEFT JOIN annotations a ON a.task_instance_id = i.id AND a.is_override = 0
    WHERE t.status = 'published'
    GROUP BY i.id
    HAVING annotation_count > 0
    ORDER BY has_disagreement DESC, i.created_at DESC
  `).all()

  return NextResponse.json({ instances })
}
