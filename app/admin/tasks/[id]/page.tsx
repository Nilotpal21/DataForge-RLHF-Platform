import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getDb } from '@/lib/db'

type Instance = {
  id: number
  prompt: string
  responses: string
  status: string
  annotation_count: number
  preferences: string | null
  created_at: string
}

type Annotation = {
  id: number
  task_instance_id: number
  preference: string
  preference_strength: string | null
  rationale: string | null
  annotator_id: number
  created_at: string
  annotator_email: string
}

function calcIAA(preferences: string | null): string {
  if (!preferences) return '—'
  const prefs = preferences.split(',').filter(Boolean)
  if (prefs.length < 2) return '—'

  const counts: Record<string, number> = {}
  for (const p of prefs) {
    counts[p] = (counts[p] || 0) + 1
  }
  const maxCount = Math.max(...Object.values(counts))
  const agreement = maxCount / prefs.length
  return `${Math.round(agreement * 100)}%`
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default async function TaskDetailPage({ params }: { params: { id: string } }) {
  const db = getDb()

  const task = db.prepare('SELECT * FROM task_templates WHERE id = ?').get(params.id) as {
    id: number
    name: string
    description: string
    task_type: string
    rubric_config: string | null
    parameters: string | null
    status: string
    created_at: string
  } | undefined

  if (!task) notFound()

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
  `).all(params.id) as Instance[]

  const annotations = db.prepare(`
    SELECT a.*, u.email as annotator_email
    FROM annotations a
    JOIN users u ON u.id = a.annotator_id
    JOIN task_instances i ON i.id = a.task_instance_id
    WHERE i.template_id = ?
    ORDER BY a.created_at DESC
  `).all(params.id) as Annotation[]

  const parameters = task.parameters ? JSON.parse(task.parameters) : {}
  const rubric = task.rubric_config ? JSON.parse(task.rubric_config) : []

  const totalAnnotations = instances.reduce((sum, i) => sum + i.annotation_count, 0)
  const completedInstances = instances.filter(i => i.status === 'completed').length

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <Link href="/admin" className="text-sm text-gray-400 hover:text-gray-600">← Dashboard</Link>
      </div>

      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{task.name}</h1>
          {task.description && (
            <p className="text-sm text-gray-500 mt-1">{task.description}</p>
          )}
          <div className="flex items-center gap-3 mt-2">
            <span className="text-xs text-gray-500">{task.task_type}</span>
            <span className={`badge ${task.status === 'published' ? 'badge-green' : 'badge-gray'}`}>
              {task.status}
            </span>
          </div>
        </div>

        <Link href="/admin/export" className="btn-secondary flex items-center gap-2 text-sm">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Export
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <div className="card p-4">
          <div className="text-xl font-bold text-gray-900">{instances.length}</div>
          <div className="text-xs text-gray-500 mt-0.5">Total Instances</div>
        </div>
        <div className="card p-4">
          <div className="text-xl font-bold text-blue-600">{completedInstances}</div>
          <div className="text-xs text-gray-500 mt-0.5">Completed</div>
        </div>
        <div className="card p-4">
          <div className="text-xl font-bold text-green-600">{totalAnnotations}</div>
          <div className="text-xs text-gray-500 mt-0.5">Annotations</div>
        </div>
        <div className="card p-4">
          <div className="text-xl font-bold text-gray-900">{parameters.annotationsPerTask || 1}</div>
          <div className="text-xs text-gray-500 mt-0.5">Required per Instance</div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Instances list */}
        <div className="col-span-2">
          <div className="card overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-700">Task Instances</h2>
            </div>
            {instances.length === 0 ? (
              <div className="p-8 text-center text-sm text-gray-400">No instances yet</div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500">#</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500">Prompt</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500">Status</th>
                    <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500">Annotations</th>
                    <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500">IAA</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {instances.map(inst => (
                    <tr key={inst.id} className="hover:bg-gray-50/50">
                      <td className="px-5 py-3 text-xs text-gray-400">#{inst.id}</td>
                      <td className="px-5 py-3">
                        <p className="text-xs text-gray-700 line-clamp-2 max-w-xs">{inst.prompt}</p>
                      </td>
                      <td className="px-5 py-3">
                        <span className={`badge ${inst.status === 'completed' ? 'badge-green' : 'badge-gray'}`}>
                          {inst.status}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right text-sm text-gray-700">{inst.annotation_count}</td>
                      <td className="px-5 py-3 text-right text-xs text-gray-500">{calcIAA(inst.preferences)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Config sidebar */}
        <div className="space-y-4">
          {/* Parameters */}
          <div className="card p-4">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Configuration</h3>
            <dl className="space-y-2">
              <div className="flex justify-between">
                <dt className="text-xs text-gray-500">Annotations per task</dt>
                <dd className="text-xs font-medium text-gray-700">{parameters.annotationsPerTask || 1}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-xs text-gray-500">Rationale</dt>
                <dd className="text-xs font-medium text-gray-700">{parameters.rationaleRequired || 'none'}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-xs text-gray-500">Randomize order</dt>
                <dd className="text-xs font-medium text-gray-700">{parameters.randomizeOrder ? 'Yes' : 'No'}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-xs text-gray-500">Annotator tier</dt>
                <dd className="text-xs font-medium text-gray-700">{parameters.annotatorTier || 'standard'}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-xs text-gray-500">Created</dt>
                <dd className="text-xs font-medium text-gray-700">{formatDate(task.created_at)}</dd>
              </div>
            </dl>
          </div>

          {/* Rubric */}
          {rubric.length > 0 && (
            <div className="card p-4">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Rubric</h3>
              <div className="space-y-2">
                {rubric.map((dim: { name: string; scale: number }, i: number) => (
                  <div key={i} className="flex justify-between items-center">
                    <span className="text-xs text-gray-700">{dim.name}</span>
                    <span className="text-xs text-gray-400">1–{dim.scale}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent annotations */}
          {annotations.length > 0 && (
            <div className="card p-4">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                Recent Annotations
              </h3>
              <div className="space-y-2">
                {annotations.slice(0, 5).map(a => (
                  <div key={a.id} className="flex items-center justify-between">
                    <div>
                      <span className={`badge text-xs ${
                        a.preference === 'A' ? 'badge-blue' :
                        a.preference === 'B' ? 'badge-green' :
                        'badge-gray'
                      }`}>
                        {a.preference === 'tie' ? 'Tie' : `Preferred ${a.preference}`}
                      </span>
                    </div>
                    <span className="text-xs text-gray-400">{a.annotator_email.split('@')[0]}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
