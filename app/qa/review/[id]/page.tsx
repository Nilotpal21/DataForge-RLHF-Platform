import { notFound } from 'next/navigation'
import { getDb } from '@/lib/db'
import QAReviewInterface from './QAReviewInterface'

export default async function QAReviewPage({ params }: { params: { id: string } }) {
  const db = await getDb()

  const instanceResult = await db.execute({
    sql: `SELECT i.*, t.name as task_name, t.task_type, t.rubric_config
    FROM task_instances i
    JOIN task_templates t ON t.id = i.template_id
    WHERE i.id = ?`,
    args: [params.id],
  })

  const instance = instanceResult.rows[0] as unknown as {
    id: number
    task_name: string
    task_type: string
    prompt: string
    responses: string
    rubric_config: string | null
  } | undefined

  if (!instance) notFound()

  const annotationsResult = await db.execute({
    sql: `SELECT a.*, u.email as annotator_email
    FROM annotations a
    JOIN users u ON u.id = a.annotator_id
    WHERE a.task_instance_id = ?
    ORDER BY a.is_override DESC, a.created_at ASC`,
    args: [params.id],
  })
  const annotations = annotationsResult.rows as unknown as Array<{
    id: number
    preference: string
    preference_strength: string | null
    rationale: string | null
    ratings: string | null
    is_override: number
    override_justification: string | null
    status: string
    annotator_email: string
    created_at: string
  }>

  const responses: string[] = JSON.parse(instance.responses)
  const rubricDimensions = instance.rubric_config ? JSON.parse(instance.rubric_config) : []

  return (
    <QAReviewInterface
      instanceId={instance.id}
      taskName={instance.task_name}
      taskType={instance.task_type}
      prompt={instance.prompt}
      responses={responses}
      rubricDimensions={rubricDimensions}
      annotations={annotations}
    />
  )
}
