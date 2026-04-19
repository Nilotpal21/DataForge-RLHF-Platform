import TaskWizard from '@/components/TaskWizard'

export default function NewTaskPage() {
  return (
    <div className="p-8 h-screen flex flex-col">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Create New Task</h1>
        <p className="text-sm text-gray-500 mt-0.5">Configure a new annotation task template</p>
      </div>
      <div className="flex-1 min-h-0">
        <TaskWizard />
      </div>
    </div>
  )
}
