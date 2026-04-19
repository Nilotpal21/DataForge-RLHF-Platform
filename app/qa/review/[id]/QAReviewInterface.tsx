'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Annotation = {
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
}

type Props = {
  instanceId: number
  taskName: string
  taskType: string
  prompt: string
  responses: string[]
  rubricDimensions: Array<{ name: string; scale: number }>
  annotations: Annotation[]
}

export default function QAReviewInterface({
  instanceId,
  taskName,
  taskType,
  prompt,
  responses,
  rubricDimensions,
  annotations,
}: Props) {
  const router = useRouter()
  const [overridePreference, setOverridePreference] = useState<string>('A')
  const [overrideStrength, setOverrideStrength] = useState<string>('')
  const [overrideRationale, setOverrideRationale] = useState('')
  const [justification, setJustification] = useState('')
  const [showOverrideForm, setShowOverrideForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const activeAnnotations = annotations.filter(a => a.status !== 'overridden')
  const overrideAnnotations = annotations.filter(a => a.is_override === 1)

  const prefs = activeAnnotations.map(a => a.preference)
  const hasDisagreement = new Set(prefs).size > 1

  async function handleOverride() {
    if (!justification.trim()) {
      setError('Justification is required for override')
      return
    }

    setSubmitting(true)
    setError('')

    try {
      const res = await fetch(`/api/qa/override/${instanceId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          preference: overridePreference,
          preference_strength: overrideStrength || null,
          rationale: overrideRationale || null,
          justification,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Override failed')
        setSubmitting(false)
        return
      }

      router.push('/qa')
      router.refresh()
    } catch {
      setError('Network error')
      setSubmitting(false)
    }
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <button
          onClick={() => router.back()}
          className="text-sm text-gray-400 hover:text-gray-600"
        >
          ← Back to queue
        </button>
      </div>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{taskName}</h1>
          <div className="flex items-center gap-2 mt-1">
            <span className="badge badge-blue">{taskType}</span>
            <span className="text-xs text-gray-400">Instance #{instanceId}</span>
            {hasDisagreement && (
              <span className="badge badge-red">Disagreement</span>
            )}
          </div>
        </div>
        {!overrideAnnotations.length && (
          <button
            onClick={() => setShowOverrideForm(!showOverrideForm)}
            className="btn-danger text-sm flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Override
          </button>
        )}
      </div>

      {/* Prompt */}
      <div className="card p-5 mb-6">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Prompt</h2>
        <p className="text-sm text-gray-800 leading-relaxed">{prompt}</p>
      </div>

      {/* Responses side by side */}
      <div className="flex gap-4 mb-6">
        {responses.map((r, i) => (
          <div key={i} className="flex-1 card overflow-hidden">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
              <span className="text-sm font-semibold text-gray-600">Response {String.fromCharCode(65 + i)}</span>
            </div>
            <div className="p-4 text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
              {r}
            </div>
          </div>
        ))}
      </div>

      {/* Annotations review */}
      <div className="mb-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">
          Annotator Responses ({activeAnnotations.length})
        </h2>

        {annotations.length === 0 ? (
          <div className="card p-6 text-center text-sm text-gray-400">No annotations yet</div>
        ) : (
          <div className="space-y-3">
            {annotations.map(annotation => (
              <div
                key={annotation.id}
                className={`card p-4 ${
                  annotation.is_override ? 'border-purple-200 bg-purple-50/30' :
                  annotation.status === 'overridden' ? 'opacity-50' : ''
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className={`badge text-xs ${
                      annotation.preference === 'A' ? 'badge-blue' :
                      annotation.preference === 'B' ? 'badge-green' :
                      'badge-gray'
                    }`}>
                      {annotation.preference === 'tie' ? 'Tie / Neither' : `Response ${annotation.preference} preferred`}
                    </span>
                    {annotation.preference_strength && (
                      <span className="text-xs text-gray-500 capitalize">{annotation.preference_strength}</span>
                    )}
                    {annotation.is_override === 1 && (
                      <span className="badge badge-yellow text-xs">QA Override</span>
                    )}
                    {annotation.status === 'overridden' && (
                      <span className="badge badge-gray text-xs">Overridden</span>
                    )}
                  </div>
                  <div className="text-xs text-gray-400">
                    {annotation.annotator_email.split('@')[0]}
                  </div>
                </div>

                {annotation.rationale && (
                  <div className="mb-2">
                    <p className="text-xs text-gray-500 mb-0.5">Rationale</p>
                    <p className="text-sm text-gray-700">{annotation.rationale}</p>
                  </div>
                )}

                {annotation.ratings && (
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Rubric Scores</p>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(JSON.parse(annotation.ratings)).map(([dim, score]) => (
                        <div key={dim} className="flex items-center gap-1 bg-gray-100 rounded px-2 py-0.5">
                          <span className="text-xs text-gray-600">{dim}</span>
                          <span className="text-xs font-medium text-gray-800">{String(score)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {annotation.override_justification && (
                  <div className="mt-2 pt-2 border-t border-purple-200">
                    <p className="text-xs text-purple-600 font-medium mb-0.5">Override justification</p>
                    <p className="text-sm text-gray-700">{annotation.override_justification}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Override form */}
      {showOverrideForm && !overrideAnnotations.length && (
        <div className="card border-red-200 p-5 space-y-4">
          <h2 className="text-sm font-semibold text-red-700 flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            Override Annotation
          </h2>
          <p className="text-xs text-gray-500">
            Overriding will mark existing annotations as overridden and record your determination.
          </p>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Preference</label>
            <div className="flex gap-2">
              {['A', 'B', 'tie'].map(p => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setOverridePreference(p)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium border ${
                    overridePreference === p ? 'bg-red-600 text-white border-red-600' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {p === 'tie' ? 'Tie' : `Response ${p}`}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Preference Strength (optional)
            </label>
            <select
              value={overrideStrength}
              onChange={e => setOverrideStrength(e.target.value)}
              className="input-field"
            >
              <option value="">Select...</option>
              <option value="significantly">Significantly better</option>
              <option value="slightly">Slightly better</option>
              <option value="negligibly">Negligibly better</option>
              <option value="unsure">Unsure</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Rationale (optional)
            </label>
            <textarea
              value={overrideRationale}
              onChange={e => setOverrideRationale(e.target.value)}
              placeholder="Your reasoning..."
              rows={2}
              className="input-field resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Override Justification <span className="text-red-500">*</span>
            </label>
            <textarea
              value={justification}
              onChange={e => setJustification(e.target.value)}
              placeholder="Explain why you're overriding the existing annotations..."
              rows={3}
              className="input-field resize-none"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2.5 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setShowOverrideForm(false)}
              className="btn-secondary flex-1"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleOverride}
              disabled={submitting || !justification.trim()}
              className="btn-danger flex-1"
            >
              {submitting ? 'Submitting...' : 'Confirm Override'}
            </button>
          </div>
        </div>
      )}

      {overrideAnnotations.length > 0 && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          This instance has been overridden by QA.
        </div>
      )}
    </div>
  )
}
