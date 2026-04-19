'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import LivePreview from './LivePreview'

type RubricDimension = {
  name: string
  scale: number
}

type WizardState = {
  // Step 1
  name: string
  description: string
  taskType: string
  // Step 2
  prompt: string
  responses: string[]
  // Step 3
  rubricDimensions: RubricDimension[]
  // Step 4
  annotationsPerTask: number
  rationaleRequired: string
  randomizeOrder: boolean
  annotatorTier: string
}

const TASK_TYPES = [
  'Side-by-Side Binary',
  'Side-by-Side Ranked',
  'Open-Ended Generation',
]

const STEP_LABELS = ['Task Setup', 'Prompt & Responses', 'Rubric', 'Parameters']

export default function TaskWizard() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [state, setState] = useState<WizardState>({
    name: '',
    description: '',
    taskType: 'Side-by-Side Binary',
    prompt: '',
    responses: ['', ''],
    rubricDimensions: [],
    annotationsPerTask: 2,
    rationaleRequired: 'optional',
    randomizeOrder: true,
    annotatorTier: 'standard',
  })

  function update(partial: Partial<WizardState>) {
    setState(prev => ({ ...prev, ...partial }))
  }

  function addResponse() {
    if (state.responses.length < 6) {
      update({ responses: [...state.responses, ''] })
    }
  }

  function removeResponse(idx: number) {
    if (state.responses.length > 2) {
      const updated = state.responses.filter((_, i) => i !== idx)
      update({ responses: updated })
    }
  }

  function updateResponse(idx: number, value: string) {
    const updated = [...state.responses]
    updated[idx] = value
    update({ responses: updated })
  }

  function addRubricDimension() {
    if (state.rubricDimensions.length < 5) {
      update({ rubricDimensions: [...state.rubricDimensions, { name: '', scale: 5 }] })
    }
  }

  function updateDimension(idx: number, field: keyof RubricDimension, value: string | number) {
    const updated = [...state.rubricDimensions]
    updated[idx] = { ...updated[idx], [field]: value }
    update({ rubricDimensions: updated })
  }

  function removeDimension(idx: number) {
    update({ rubricDimensions: state.rubricDimensions.filter((_, i) => i !== idx) })
  }

  function canProceed(): boolean {
    if (step === 1) return !!state.name && !!state.taskType
    if (step === 2) return !!state.prompt && state.responses.filter(r => r.trim()).length >= 2
    if (step === 3) return true
    if (step === 4) return true
    return false
  }

  async function handlePublish(status: 'draft' | 'published') {
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: state.name,
          description: state.description,
          task_type: state.taskType,
          rubric_config: state.rubricDimensions.filter(d => d.name),
          parameters: {
            annotationsPerTask: state.annotationsPerTask,
            rationaleRequired: state.rationaleRequired,
            randomizeOrder: state.randomizeOrder,
            annotatorTier: state.annotatorTier,
          },
          status,
          instances: [
            {
              prompt: state.prompt,
              responses: state.responses.filter(r => r.trim()),
            },
          ],
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Failed to save task')
        return
      }

      router.push(`/admin/tasks/${data.task.id}`)
    } catch {
      setError('Network error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex gap-6 h-full">
      {/* Left: Wizard form */}
      <div className="flex-1 flex flex-col">
        {/* Step indicator */}
        <div className="flex items-center gap-0 mb-8">
          {STEP_LABELS.map((label, i) => {
            const num = i + 1
            const isActive = num === step
            const isDone = num < step
            return (
              <div key={num} className="flex items-center">
                <div className="flex items-center gap-2">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${
                    isActive ? 'bg-blue-600 text-white' :
                    isDone ? 'bg-blue-100 text-blue-600' :
                    'bg-gray-100 text-gray-400'
                  }`}>
                    {isDone ? (
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    ) : num}
                  </div>
                  <span className={`text-xs font-medium hidden sm:block ${isActive ? 'text-blue-600' : 'text-gray-400'}`}>
                    {label}
                  </span>
                </div>
                {i < STEP_LABELS.length - 1 && (
                  <div className={`w-12 h-px mx-3 ${isDone ? 'bg-blue-300' : 'bg-gray-200'}`} />
                )}
              </div>
            )
          })}
        </div>

        {/* Step content */}
        <div className="card flex-1 p-6">
          {step === 1 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-base font-semibold text-gray-900 mb-0.5">Task Setup</h2>
                <p className="text-sm text-gray-500">Define the basic task configuration.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Task Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={state.name}
                  onChange={e => update({ name: e.target.value })}
                  placeholder="e.g., Instruction Following Evaluation"
                  className="input-field"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Description
                </label>
                <textarea
                  value={state.description}
                  onChange={e => update({ description: e.target.value })}
                  placeholder="Describe the annotation task for annotators..."
                  rows={3}
                  className="input-field resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Task Type <span className="text-red-500">*</span>
                </label>
                <div className="space-y-2">
                  {TASK_TYPES.map(type => (
                    <label key={type} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      state.taskType === type ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                    }`}>
                      <input
                        type="radio"
                        name="taskType"
                        value={type}
                        checked={state.taskType === type}
                        onChange={() => update({ taskType: type })}
                      />
                      <span className="text-sm font-medium text-gray-700">{type}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-base font-semibold text-gray-900 mb-0.5">Prompt & Responses</h2>
                <p className="text-sm text-gray-500">Add the prompt and response options to compare.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Prompt <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={state.prompt}
                  onChange={e => update({ prompt: e.target.value })}
                  placeholder="Enter the prompt that was given to the model(s)..."
                  rows={4}
                  className="input-field resize-none"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-gray-700">
                    Responses <span className="text-red-500">*</span>
                    <span className="text-gray-400 font-normal ml-1">(min 2, max 6)</span>
                  </label>
                  {state.responses.length < 6 && (
                    <button
                      type="button"
                      onClick={addResponse}
                      className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                    >
                      + Add response
                    </button>
                  )}
                </div>
                <div className="space-y-3">
                  {state.responses.map((r, idx) => (
                    <div key={idx} className="flex gap-2">
                      <div className="flex-shrink-0 w-8 h-9 bg-gray-100 rounded-lg flex items-center justify-center text-xs font-semibold text-gray-500">
                        {String.fromCharCode(65 + idx)}
                      </div>
                      <textarea
                        value={r}
                        onChange={e => updateResponse(idx, e.target.value)}
                        placeholder={`Response ${String.fromCharCode(65 + idx)}...`}
                        rows={3}
                        className="input-field resize-none flex-1"
                      />
                      {state.responses.length > 2 && (
                        <button
                          type="button"
                          onClick={() => removeResponse(idx)}
                          className="flex-shrink-0 text-gray-400 hover:text-red-500 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-semibold text-gray-900 mb-0.5">Rubric Builder</h2>
                  <p className="text-sm text-gray-500">Define scoring dimensions (optional, max 5).</p>
                </div>
                {state.rubricDimensions.length < 5 && (
                  <button
                    type="button"
                    onClick={addRubricDimension}
                    className="btn-secondary text-sm"
                  >
                    + Add Dimension
                  </button>
                )}
              </div>

              {state.rubricDimensions.length === 0 ? (
                <div className="text-center py-10 border-2 border-dashed border-gray-200 rounded-xl">
                  <p className="text-sm text-gray-400 mb-3">No rubric dimensions added yet</p>
                  <button
                    type="button"
                    onClick={addRubricDimension}
                    className="btn-secondary text-sm"
                  >
                    Add First Dimension
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {state.rubricDimensions.map((dim, idx) => (
                    <div key={idx} className="flex gap-3 items-start p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="flex-1 space-y-2">
                        <input
                          type="text"
                          value={dim.name}
                          onChange={e => updateDimension(idx, 'name', e.target.value)}
                          placeholder="Dimension name (e.g., Helpfulness)"
                          className="input-field text-sm"
                        />
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500">Likert scale:</span>
                          {[3, 5, 7].map(n => (
                            <button
                              key={n}
                              type="button"
                              onClick={() => updateDimension(idx, 'scale', n)}
                              className={`px-2.5 py-1 rounded text-xs font-medium ${
                                dim.scale === n
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-white border border-gray-200 text-gray-600 hover:border-blue-300'
                              }`}
                            >
                              1–{n}
                            </button>
                          ))}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeDimension(idx)}
                        className="text-gray-400 hover:text-red-500 transition-colors mt-1"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {step === 4 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-base font-semibold text-gray-900 mb-0.5">Parameters</h2>
                <p className="text-sm text-gray-500">Configure how annotations are collected.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Annotations Per Task
                </label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map(n => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => update({ annotationsPerTask: n })}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                        state.annotationsPerTask === n
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Rationale Required
                </label>
                <div className="flex gap-2">
                  {[
                    { value: 'required', label: 'Required' },
                    { value: 'optional', label: 'Optional' },
                    { value: 'none', label: 'None' },
                  ].map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => update({ rationaleRequired: opt.value })}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                        state.rationaleRequired === opt.value
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Annotator Tier
                </label>
                <select
                  value={state.annotatorTier}
                  onChange={e => update({ annotatorTier: e.target.value })}
                  className="input-field"
                >
                  <option value="standard">Standard</option>
                  <option value="senior">Senior</option>
                  <option value="expert">Expert</option>
                </select>
              </div>

              <div>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={state.randomizeOrder}
                    onChange={e => update({ randomizeOrder: e.target.checked })}
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <div>
                    <div className="text-sm font-medium text-gray-700">Randomize Response Order</div>
                    <div className="text-xs text-gray-500">Randomly shuffle A/B positions for each annotator</div>
                  </div>
                </label>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2.5 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => handlePublish('draft')}
                  disabled={saving}
                  className="btn-secondary flex-1"
                >
                  Save as Draft
                </button>
                <button
                  type="button"
                  onClick={() => handlePublish('published')}
                  disabled={saving}
                  className="btn-primary flex-1"
                >
                  {saving ? 'Publishing...' : 'Publish Task'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex justify-between mt-4">
          <button
            type="button"
            onClick={() => setStep(s => Math.max(1, s - 1))}
            disabled={step === 1}
            className="btn-secondary disabled:opacity-40"
          >
            ← Back
          </button>

          {step < 4 && (
            <button
              type="button"
              onClick={() => setStep(s => Math.min(4, s + 1))}
              disabled={!canProceed()}
              className="btn-primary disabled:opacity-40"
            >
              Next →
            </button>
          )}
        </div>
      </div>

      {/* Right: Live Preview */}
      <div className="w-80 xl:w-96 flex-shrink-0">
        <div className="card h-full sticky top-4 overflow-hidden" style={{ maxHeight: 'calc(100vh - 6rem)' }}>
          <LivePreview
            taskName={state.name}
            taskType={state.taskType}
            prompt={state.prompt}
            responses={state.responses}
            rubricDimensions={state.rubricDimensions}
            rationaleRequired={state.rationaleRequired}
          />
        </div>
      </div>
    </div>
  )
}
