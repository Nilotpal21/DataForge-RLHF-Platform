'use client'

import Link from 'next/link'

type TaskInstance = {
  id: number
  task_name: string
  task_type: string
  prompt: string
  parameters: string | null
  annotation_count: number
  created_at: string
}

type TaskQueueProps = {
  instances: TaskInstance[]
}

const TYPE_COLORS: Record<string, string> = {
  'Side-by-Side Binary': 'badge-blue',
  'Side-by-Side Ranked': 'badge-yellow',
  'Open-Ended Generation': 'badge-green',
}

function getPriority(instance: TaskInstance): { label: string; color: string } {
  const params = instance.parameters ? JSON.parse(instance.parameters) : {}
  if (params.annotatorTier === 'expert') return { label: 'High', color: 'text-red-600' }
  if (params.annotatorTier === 'senior') return { label: 'Medium', color: 'text-yellow-600' }
  return { label: 'Normal', color: 'text-gray-500' }
}

function getEstimatedTime(instance: TaskInstance): string {
  const params = instance.parameters ? JSON.parse(instance.parameters) : {}
  const rubric = instance.parameters ? JSON.parse(instance.parameters) : null
  const hasRubric = rubric?.rubricDimensions?.length > 0
  const requiresRationale = params.rationaleRequired === 'required'

  if (hasRubric && requiresRationale) return '5–8 min'
  if (hasRubric || requiresRationale) return '3–5 min'
  return '1–3 min'
}

export default function TaskQueue({ instances }: TaskQueueProps) {
  if (instances.length === 0) {
    return (
      <div className="card p-12 text-center">
        <div className="w-14 h-14 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <svg className="w-7 h-7 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="text-base font-semibold text-gray-800 mb-1">All caught up!</h3>
        <p className="text-sm text-gray-500">No pending tasks in your queue right now.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {instances.map(instance => {
        const priority = getPriority(instance)
        const typeColor = TYPE_COLORS[instance.task_type] || 'badge-gray'

        return (
          <div key={instance.id} className="card p-4 hover:shadow-md transition-shadow">
            <div className="flex items-start gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className={typeColor}>{instance.task_type}</span>
                  <span className={`text-xs font-medium ${priority.color}`}>
                    {priority.label} priority
                  </span>
                </div>
                <h3 className="text-sm font-semibold text-gray-800 truncate mb-1">
                  {instance.task_name}
                </h3>
                <p className="text-xs text-gray-500 line-clamp-1 mb-2">
                  {instance.prompt}
                </p>
                <div className="flex items-center gap-3 text-xs text-gray-400">
                  <span className="flex items-center gap-1">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    ~{getEstimatedTime(instance)}
                  </span>
                  <span>Task #{instance.id}</span>
                </div>
              </div>

              <Link
                href={`/annotator/tasks/${instance.id}`}
                className="flex-shrink-0 btn-primary text-sm py-1.5 px-4"
              >
                Start
              </Link>
            </div>
          </div>
        )
      })}
    </div>
  )
}
