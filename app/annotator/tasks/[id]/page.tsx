import { notFound, redirect } from 'next/navigation'
import { getDb } from '@/lib/db'
import { getAuthUser } from '@/lib/auth'
import AnnotationInterface from './AnnotationInterface'

export default async function AnnotationPage({ params }: { params: { id: string } }) {
  const auth = await getAuthUser()
  if (!auth) redirect('/login')

  const db = getDb()

  const instance = db.prepare(`
    SELECT i.*, t.name as task_name, t.task_type, t.rubric_config, t.parameters, t.status as task_status
    FROM task_instances i
    JOIN task_templates t ON t.id = i.template_id
    WHERE i.id = ?
  `).get(params.id) as {
    id: number
    template_id: number
    task_name: string
    task_type: string
    task_status: string
    prompt: string
    responses: string
    status: string
    rubric_config: string | null
    parameters: string | null
  } | undefined

  if (!instance) notFound()
  if (instance.task_status !== 'published') {
    redirect('/annotator')
  }

  // Check if already annotated
  const existing = db.prepare(
    'SELECT id FROM annotations WHERE task_instance_id = ? AND annotator_id = ?'
  ).get(params.id, auth.userId)

  if (existing) {
    redirect('/annotator?already_done=1')
  }

  const responses: string[] = JSON.parse(instance.responses)
  const rubricDimensions = instance.rubric_config ? JSON.parse(instance.rubric_config) : []
  const parameters = instance.parameters ? JSON.parse(instance.parameters) : {}

  return (
    <AnnotationInterface
      instanceId={instance.id}
      taskName={instance.task_name}
      taskType={instance.task_type}
      prompt={instance.prompt}
      responses={responses}
      rubricDimensions={rubricDimensions}
      parameters={parameters}
    />
  )
}
