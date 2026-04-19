import { notFound, redirect } from 'next/navigation'
import { getDb } from '@/lib/db'
import { getAuthUser } from '@/lib/auth'
import AnnotationInterface from './AnnotationInterface'

export default async function AnnotationPage({ params }: { params: { id: string } }) {
  const auth = await getAuthUser()
  if (!auth) redirect('/login')

  const db = await getDb()

  const instanceResult = await db.execute({
    sql: `SELECT i.*, t.name as task_name, t.task_type, t.rubric_config, t.parameters, t.status as task_status
    FROM task_instances i
    JOIN task_templates t ON t.id = i.template_id
    WHERE i.id = ?`,
    args: [params.id],
  })

  const instance = instanceResult.rows[0] as unknown as {
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
  const existingResult = await db.execute({
    sql: 'SELECT id FROM annotations WHERE task_instance_id = ? AND annotator_id = ?',
    args: [params.id, auth.userId],
  })

  if (existingResult.rows[0]) {
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
