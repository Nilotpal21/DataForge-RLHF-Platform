import { getDb } from '@/lib/db'
import { getAuthUser } from '@/lib/auth'
import TaskQueue from '@/components/TaskQueue'

export default async function AnnotatorDashboard() {
  const auth = await getAuthUser()
  if (!auth) return null

  const db = getDb()

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
  `).all(auth.userId) as Array<{
    id: number
    task_name: string
    task_type: string
    prompt: string
    parameters: string | null
    annotation_count: number
    created_at: string
  }>

  const completedCount = (db.prepare(
    'SELECT COUNT(*) as c FROM annotations WHERE annotator_id = ?'
  ).get(auth.userId) as { c: number }).c

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Task Queue</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {instances.length} task{instances.length !== 1 ? 's' : ''} pending • {completedCount} completed
        </p>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 gap-4 mb-8 max-w-sm">
        <div className="card p-4">
          <div className="text-xl font-bold text-blue-600">{instances.length}</div>
          <div className="text-xs text-gray-500 mt-0.5">Pending</div>
        </div>
        <div className="card p-4">
          <div className="text-xl font-bold text-green-600">{completedCount}</div>
          <div className="text-xs text-gray-500 mt-0.5">Completed</div>
        </div>
      </div>

      <TaskQueue instances={instances} />
    </div>
  )
}
