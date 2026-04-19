'use client'

type RubricDimension = {
  name: string
  scale: number
}

type LivePreviewProps = {
  taskName: string
  taskType: string
  prompt: string
  responses: string[]
  rubricDimensions: RubricDimension[]
  rationaleRequired: string
}

export default function LivePreview({
  taskName,
  taskType,
  prompt,
  responses,
  rubricDimensions,
  rationaleRequired,
}: LivePreviewProps) {
  const hasContent = taskName || prompt || responses.some(r => r)

  return (
    <div className="h-full flex flex-col">
      <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
          <span className="text-xs font-medium text-gray-600">Live Preview — Annotator View</span>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4">
        {!hasContent ? (
          <div className="h-full flex flex-col items-center justify-center text-center">
            <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center mb-3">
              <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </div>
            <p className="text-sm text-gray-500">Fill in the form to see a live preview</p>
          </div>
        ) : (
          <div className="space-y-4 text-xs">
            {/* Task header mock */}
            <div className="bg-gray-800 text-white rounded-lg px-3 py-2 flex items-center justify-between">
              <span className="font-medium text-xs">{taskName || 'Untitled Task'}</span>
              <span className="bg-blue-600 text-white text-xs px-2 py-0.5 rounded-full">
                {taskType || 'Binary'}
              </span>
            </div>

            {/* Prompt */}
            {prompt && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="text-xs font-semibold text-blue-700 mb-1">Prompt</div>
                <p className="text-gray-700 text-xs leading-relaxed line-clamp-3">{prompt}</p>
              </div>
            )}

            {/* Responses */}
            <div className="flex gap-2">
              {responses.filter(r => r).slice(0, 2).map((r, i) => (
                <div key={i} className="flex-1 border-2 border-gray-200 rounded-lg overflow-hidden">
                  <div className="bg-gray-50 px-2 py-1.5 border-b border-gray-200">
                    <span className="text-xs font-semibold text-gray-500">
                      Response {String.fromCharCode(65 + i)}
                    </span>
                  </div>
                  <div className="p-2 text-gray-600 text-xs line-clamp-4 leading-relaxed">
                    {r}
                  </div>
                </div>
              ))}
              {responses.filter(r => r).length === 0 && (
                <div className="flex gap-2 w-full">
                  {['A', 'B'].map(l => (
                    <div key={l} className="flex-1 border-2 border-dashed border-gray-200 rounded-lg p-3 text-center">
                      <span className="text-gray-400 text-xs">Response {l}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Preference buttons */}
            <div className="flex gap-1.5">
              <div className="flex-1 bg-gray-100 rounded py-1.5 text-center text-gray-500 text-xs">A is better</div>
              <div className="px-2 bg-gray-100 rounded py-1.5 text-center text-gray-500 text-xs">Tie</div>
              <div className="flex-1 bg-gray-100 rounded py-1.5 text-center text-gray-500 text-xs">B is better</div>
            </div>

            {/* Rubric */}
            {rubricDimensions.filter(d => d.name).length > 0 && (
              <div className="border border-gray-200 rounded-lg p-3 space-y-2">
                <div className="text-xs font-semibold text-gray-600">Rubric Scoring</div>
                {rubricDimensions.filter(d => d.name).map((dim, i) => (
                  <div key={i}>
                    <div className="text-xs text-gray-600 mb-1">{dim.name}</div>
                    <div className="flex gap-1">
                      {Array.from({ length: dim.scale }, (_, j) => (
                        <div key={j} className="flex-1 h-6 bg-gray-100 rounded text-center text-xs text-gray-400 flex items-center justify-center">
                          {j + 1}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Rationale */}
            {rationaleRequired !== 'none' && rationaleRequired && (
              <div>
                <div className="text-xs font-medium text-gray-600 mb-1">
                  Rationale {rationaleRequired === 'required' ? '(required)' : '(optional)'}
                </div>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-2 h-12 text-gray-400 text-xs">
                  Explain your reasoning...
                </div>
              </div>
            )}

            {/* Submit button */}
            <div className="bg-blue-600 text-white text-center rounded-lg py-2 text-xs font-medium opacity-50">
              Submit Annotation
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
