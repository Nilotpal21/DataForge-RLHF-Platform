'use client'

import { useState } from 'react'

type Task = {
  id: number
  name: string
  task_type: string
  status: string
  annotation_count: number
}

type ExportPanelProps = {
  tasks: Task[]
}

export default function ExportPanel({ tasks }: ExportPanelProps) {
  const [selectedTask, setSelectedTask] = useState<string>('')
  const [format, setFormat] = useState<'jsonl' | 'anthropic'>('jsonl')
  const [loading, setLoading] = useState(false)

  const publishedTasks = tasks.filter(t => t.status === 'published')

  async function handleExport() {
    if (!selectedTask) return
    setLoading(true)
    try {
      const url = `/api/export?task_id=${selectedTask}&format=${format}`
      const res = await fetch(url)
      if (!res.ok) {
        alert('Export failed')
        return
      }
      const blob = await res.blob()
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = `task_${selectedTask}_${format}.jsonl`
      a.click()
      URL.revokeObjectURL(a.href)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="card p-6 space-y-6 max-w-lg">
      <div>
        <h2 className="text-base font-semibold text-gray-900 mb-1">Export Annotation Data</h2>
        <p className="text-sm text-gray-500">Download completed annotations in your preferred format.</p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Select Task
          </label>
          <select
            value={selectedTask}
            onChange={e => setSelectedTask(e.target.value)}
            className="input-field"
          >
            <option value="">Choose a task...</option>
            {publishedTasks.map(t => (
              <option key={t.id} value={t.id}>
                {t.name} ({t.annotation_count} annotations)
              </option>
            ))}
          </select>
          {publishedTasks.length === 0 && (
            <p className="text-xs text-gray-500 mt-1">No published tasks available.</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Export Format
          </label>
          <div className="space-y-2">
            <label className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
              format === 'jsonl' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
            }`}>
              <input
                type="radio"
                name="format"
                value="jsonl"
                checked={format === 'jsonl'}
                onChange={() => setFormat('jsonl')}
                className="mt-0.5"
              />
              <div>
                <div className="text-sm font-medium text-gray-800">JSON Lines (Full)</div>
                <div className="text-xs text-gray-500 mt-0.5">
                  Complete annotation data: prompt, chosen, rejected, preference strength, rationale, ratings
                </div>
              </div>
            </label>

            <label className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
              format === 'anthropic' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
            }`}>
              <input
                type="radio"
                name="format"
                value="anthropic"
                checked={format === 'anthropic'}
                onChange={() => setFormat('anthropic')}
                className="mt-0.5"
              />
              <div>
                <div className="text-sm font-medium text-gray-800">Anthropic Preference Format</div>
                <div className="text-xs text-gray-500 mt-0.5">
                  Simplified chosen/rejected pairs: {"{ prompt, chosen, rejected }"}
                </div>
              </div>
            </label>
          </div>
        </div>
      </div>

      <button
        onClick={handleExport}
        disabled={!selectedTask || loading}
        className="btn-primary w-full flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Exporting...
          </>
        ) : (
          <>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Download Export
          </>
        )}
      </button>
    </div>
  )
}
