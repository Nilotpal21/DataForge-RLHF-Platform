import { getDb } from '@/lib/db'
import ExportPanel from '@/components/ExportPanel'

export default async function ExportPage() {
  const db = getDb()

  const tasks = db.prepare(`
    SELECT
      t.*,
      COUNT(DISTINCT i.id) as instance_count,
      COUNT(DISTINCT a.id) as annotation_count
    FROM task_templates t
    LEFT JOIN task_instances i ON i.template_id = t.id
    LEFT JOIN annotations a ON a.task_instance_id = i.id
    GROUP BY t.id
    ORDER BY t.created_at DESC
  `).all() as Array<{
    id: number
    name: string
    task_type: string
    status: string
    annotation_count: number
  }>

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Export Data</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Download annotation data in JSONL or Anthropic preference format
        </p>
      </div>

      <ExportPanel tasks={tasks} />

      <div className="mt-8 card p-5 max-w-lg">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Format Reference</h3>
        <div className="space-y-4">
          <div>
            <div className="text-xs font-semibold text-gray-500 mb-1.5">JSON Lines (Full)</div>
            <pre className="bg-gray-900 text-green-400 text-xs rounded-lg p-3 overflow-x-auto">
{`{"prompt":"...","chosen":"...","rejected":"...",
 "preference":"A","preference_strength":"significantly",
 "rationale":"...","ratings":{...},
 "annotator_id":2,"task_id":1,"timestamp":"..."}`}
            </pre>
          </div>
          <div>
            <div className="text-xs font-semibold text-gray-500 mb-1.5">Anthropic Format</div>
            <pre className="bg-gray-900 text-green-400 text-xs rounded-lg p-3 overflow-x-auto">
{`{"prompt":"...","chosen":"...","rejected":"..."}`}
            </pre>
          </div>
        </div>
      </div>
    </div>
  )
}
