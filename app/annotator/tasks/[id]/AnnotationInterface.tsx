'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import SideBySide from '@/components/SideBySide'
import RubricScoring from '@/components/RubricScoring'

type RubricDimension = {
  name: string
  scale: number
}

type Parameters = {
  rationaleRequired?: string
  randomizeOrder?: boolean
  annotationsPerTask?: number
}

type Props = {
  instanceId: number
  taskName: string
  taskType: string
  prompt: string
  responses: string[]
  rubricDimensions: RubricDimension[]
  parameters: Parameters
}

export default function AnnotationInterface({
  instanceId,
  taskName,
  taskType,
  prompt,
  responses,
  rubricDimensions,
  parameters,
}: Props) {
  const router = useRouter()
  const [preference, setPreference] = useState<'A' | 'B' | 'tie' | null>(null)
  const [preferenceStrength, setPreferenceStrength] = useState<string>('')
  const [ratings, setRatings] = useState<Record<string, number>>({})
  const [rationale, setRationale] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [promptCollapsed, setPromptCollapsed] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const rationaleRequired = parameters.rationaleRequired || 'optional'
  const showRationale = rationaleRequired !== 'none'
  const isRationaleRequired = rationaleRequired === 'required'

  const allRubricScored = rubricDimensions.length === 0 ||
    rubricDimensions.every(d => ratings[d.name] !== undefined)

  const rationaleOk = !isRationaleRequired || rationale.trim().length > 0

  const canSubmit = preference !== null && allRubricScored && rationaleOk

  const handleSubmit = useCallback(async () => {
    if (!canSubmit || submitting) return

    setSubmitting(true)
    setError('')

    try {
      const res = await fetch(`/api/instances/${instanceId}/annotate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          preference,
          preference_strength: preferenceStrength || null,
          ratings: Object.keys(ratings).length > 0 ? ratings : null,
          rationale: rationale || null,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Submission failed')
        setSubmitting(false)
        return
      }

      setSubmitted(true)
      setTimeout(() => router.push('/annotator'), 1500)
    } catch {
      setError('Network error')
      setSubmitting(false)
    }
  }, [canSubmit, submitting, instanceId, preference, preferenceStrength, ratings, rationale, router])

  // Keyboard shortcuts
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'TEXTAREA' || tag === 'INPUT') return

      if (e.key === '1') setPreference('A')
      if (e.key === '2') setPreference('B')
      if (e.key === '3') setPreference('tie')
      if (e.key === 's' || e.key === 'S') {
        e.preventDefault()
        handleSubmit()
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [handleSubmit])

  const scoredCount = rubricDimensions.filter(d => ratings[d.name] !== undefined).length

  if (submitted) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-gray-800 mb-1">Annotation Submitted!</h2>
          <p className="text-sm text-gray-500">Returning to task queue...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Top bar */}
      <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-4">
          <div>
            <span className="text-sm font-semibold text-gray-800">{taskName}</span>
            <span className="ml-2 text-xs text-gray-400">#{instanceId}</span>
          </div>
          <span className="badge badge-blue">{taskType}</span>
        </div>

        <div className="flex items-center gap-4">
          {/* Progress */}
          {rubricDimensions.length > 0 && (
            <div className="text-xs text-gray-500 flex items-center gap-1.5">
              <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full transition-all"
                  style={{ width: `${(scoredCount / rubricDimensions.length) * 100}%` }}
                />
              </div>
              {scoredCount}/{rubricDimensions.length} scored
            </div>
          )}

          {/* Keyboard shortcuts hint */}
          <div className="text-xs text-gray-400 hidden lg:block">
            <kbd className="bg-gray-100 px-1.5 py-0.5 rounded text-xs">1</kbd> A &nbsp;
            <kbd className="bg-gray-100 px-1.5 py-0.5 rounded text-xs">2</kbd> B &nbsp;
            <kbd className="bg-gray-100 px-1.5 py-0.5 rounded text-xs">3</kbd> Tie &nbsp;
            <kbd className="bg-gray-100 px-1.5 py-0.5 rounded text-xs">S</kbd> Submit
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="max-w-6xl mx-auto p-6 space-y-5">
          {/* Prompt panel */}
          <div className="card overflow-hidden">
            <button
              type="button"
              onClick={() => setPromptCollapsed(!promptCollapsed)}
              className="w-full flex items-center justify-between px-5 py-3 bg-gray-50 border-b border-gray-200 text-left hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
                <span className="text-sm font-semibold text-gray-700">Prompt</span>
              </div>
              <svg
                className={`w-4 h-4 text-gray-400 transition-transform ${promptCollapsed ? '-rotate-90' : ''}`}
                fill="none" stroke="currentColor" viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {!promptCollapsed && (
              <div className="px-5 py-4">
                <p className="text-gray-800 text-sm leading-relaxed whitespace-pre-wrap">{prompt}</p>
              </div>
            )}
          </div>

          {/* Side by side comparison */}
          <SideBySide
            responseA={responses[0] || ''}
            responseB={responses[1] || ''}
            selected={preference}
            onSelect={setPreference}
            preferenceStrength={preferenceStrength}
            onStrengthChange={setPreferenceStrength}
            showStrength={taskType === 'Side-by-Side Ranked' || taskType === 'Side-by-Side Binary'}
          />

          {/* Bottom panel: rubric + rationale */}
          <div className="grid grid-cols-2 gap-5">
            {/* Rubric scoring */}
            {rubricDimensions.length > 0 && (
              <div className="card p-5">
                <RubricScoring
                  dimensions={rubricDimensions}
                  values={ratings}
                  onChange={setRatings}
                />
              </div>
            )}

            {/* Rationale */}
            {showRationale && (
              <div className={`card p-5 ${rubricDimensions.length === 0 ? 'col-span-2' : ''}`}>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-800">
                    Rationale
                    {isRationaleRequired && (
                      <span className="ml-1 text-red-500">*</span>
                    )}
                  </h3>
                  {!isRationaleRequired && (
                    <span className="text-xs text-gray-400">optional</span>
                  )}
                </div>
                <textarea
                  value={rationale}
                  onChange={e => setRationale(e.target.value)}
                  placeholder="Explain your reasoning for the preference you selected..."
                  rows={4}
                  className="input-field resize-none text-sm"
                />
                <div className="mt-1.5 flex justify-end">
                  <span className="text-xs text-gray-400">{rationale.length} chars</span>
                </div>
              </div>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Submit area */}
          <div className="card p-4 flex items-center justify-between">
            <div className="text-xs text-gray-500 space-x-3">
              <span className={preference ? 'text-green-600 font-medium' : 'text-gray-400'}>
                {preference ? `✓ Preference: ${preference === 'tie' ? 'Tie' : `Response ${preference}`}` : '○ Select preference'}
              </span>
              {rubricDimensions.length > 0 && (
                <span className={allRubricScored ? 'text-green-600 font-medium' : 'text-gray-400'}>
                  {allRubricScored ? '✓ Rubric complete' : `○ Rubric (${scoredCount}/${rubricDimensions.length})`}
                </span>
              )}
              {isRationaleRequired && (
                <span className={rationale.trim() ? 'text-green-600 font-medium' : 'text-gray-400'}>
                  {rationale.trim() ? '✓ Rationale added' : '○ Rationale required'}
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={!canSubmit || submitting}
              className={`px-6 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                canSubmit && !submitting
                  ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm shadow-blue-200'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              }`}
            >
              {submitting ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Submitting...
                </span>
              ) : 'Submit Annotation'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
