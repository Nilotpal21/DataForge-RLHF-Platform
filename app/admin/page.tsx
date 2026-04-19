import Link from 'next/link'
import { getDb } from '@/lib/db'

type TaskRow = {
  id: number
  name: string
  task_type: string
  status: string
  annotation_count: number
  instance_count: number
  created_at: string
}

const STATUS_BADGE: Record<string, string> = {
  draft: 'badge-gray',
  published: 'badge-green',
  archived: 'badge-yellow',
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export default async function AdminDashboard() {
  const db = await getDb()

  const tasksResult = await db.execute(`
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
  const tasks = tasksResult.rows as unknown as TaskRow[]

  const totalAnnotations = tasks.reduce((sum, t) => sum + t.annotation_count, 0)
  const publishedTasks = tasks.filter(t => t.status === 'published').length

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage annotation tasks and monitor progress</p>
        </div>
        <Link href="/admin/tasks/new" className="btn-primary flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Task
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="card p-5">
          <div className="text-2xl font-bold text-gray-900">{tasks.length}</div>
          <div className="text-sm text-gray-500 mt-0.5">Total Tasks</div>
        </div>
        <div className="card p-5">
          <div className="text-2xl font-bold text-blue-600">{publishedTasks}</div>
          <div className="text-sm text-gray-500 mt-0.5">Published</div>
        </div>
        <div className="card p-5">
          <div className="text-2xl font-bold text-green-600">{totalAnnotations}</div>
          <div className="text-sm text-gray-500 mt-0.5">Total Annotations</div>
        </div>
      </div>

      {/* Tasks table */}
      <div className="card overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700">Task Templates</h2>
        </div>

        {tasks.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-gray-400 text-sm mb-3">No tasks yet</p>
            <Link href="/admin/tasks/new" className="btn-primary text-sm">
              Create your first task
            </Link>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Name</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Type</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Instances</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Annotations</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Created</th>
                <th className="px-6 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {tasks.map(task => (
                <tr key={task.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">{task.name}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs text-gray-500">{task.task_type}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={STATUS_BADGE[task.status] || 'badge-gray'}>
                      {task.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="text-sm text-gray-700">{task.instance_count}</span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="text-sm text-gray-700">{task.annotation_count}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs text-gray-500">{formatDate(task.created_at)}</span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Link
                      href={`/admin/tasks/${task.id}`}
                      className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                    >
                      View →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
