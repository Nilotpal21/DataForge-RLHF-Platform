import Link from 'next/link'
import { getDb } from '@/lib/db'

type ReviewItem = {
  id: number
  task_name: string
  task_type: string
  prompt: string
  status: string
  annotation_count: number
  preferences: string | null
  has_disagreement: number
  created_at: string
}

export default async function QADashboard() {
  const db = getDb()

  const instances = db.prepare(`
    SELECT
      i.*,
      t.name as task_name,
      t.task_type,
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
  `).all() as ReviewItem[]

  const disagreements = instances.filter(i => i.has_disagreement === 1)
  const agreed = instances.filter(i => i.has_disagreement === 0)

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">QA Review Queue</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Review annotated task instances and override when needed
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="card p-4">
          <div className="text-xl font-bold text-gray-900">{instances.length}</div>
          <div className="text-xs text-gray-500 mt-0.5">Total Reviewed</div>
        </div>
        <div className="card p-4">
          <div className="text-xl font-bold text-red-600">{disagreements.length}</div>
          <div className="text-xs text-gray-500 mt-0.5">Disagreements</div>
        </div>
        <div className="card p-4">
          <div className="text-xl font-bold text-green-600">{agreed.length}</div>
          <div className="text-xs text-gray-500 mt-0.5">Agreed</div>
        </div>
      </div>

      {instances.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-gray-400">No annotated instances to review yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Disagreements first */}
          {disagreements.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-red-600 mb-3 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                Disagreements ({disagreements.length})
              </h2>
              <div className="space-y-2">
                {disagreements.map(item => (
                  <InstanceCard key={item.id} item={item} flagged />
                ))}
              </div>
            </div>
          )}

          {agreed.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-gray-500 mb-3">Agreed ({agreed.length})</h2>
              <div className="space-y-2">
                {agreed.map(item => (
                  <InstanceCard key={item.id} item={item} flagged={false} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function InstanceCard({ item, flagged }: { item: ReviewItem; flagged: boolean }) {
  const prefs = item.preferences ? item.preferences.split(',') : []
  const prefCounts: Record<string, number> = {}
  for (const p of prefs) {
    prefCounts[p] = (prefCounts[p] || 0) + 1
  }

  return (
    <div className={`card p-4 ${flagged ? 'border-red-200' : ''}`}>
      <div className="flex items-start gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="badge badge-blue text-xs">{item.task_type}</span>
            {flagged && (
              <span className="badge badge-red text-xs">Disagreement</span>
            )}
            <span className="text-xs text-gray-400">#{item.id}</span>
          </div>
          <h3 className="text-sm font-semibold text-gray-800 mb-1">{item.task_name}</h3>
          <p className="text-xs text-gray-500 line-clamp-1 mb-2">{item.prompt}</p>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">{item.annotation_count} annotation{item.annotation_count !== 1 ? 's' : ''}</span>
            {Object.entries(prefCounts).map(([pref, count]) => (
              <span key={pref} className={`badge text-xs ${
                pref === 'A' ? 'badge-blue' : pref === 'B' ? 'badge-green' : 'badge-gray'
              }`}>
                {pref === 'tie' ? 'Tie' : `${pref}`}: {count}
              </span>
            ))}
          </div>
        </div>
        <Link
          href={`/qa/review/${item.id}`}
          className="flex-shrink-0 btn-secondary text-sm py-1.5 px-4"
        >
          Review
        </Link>
      </div>
    </div>
  )
}
