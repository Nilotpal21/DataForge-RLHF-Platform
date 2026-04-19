'use client'

type RubricDimension = {
  name: string
  scale: number
}

type RubricScoringProps = {
  dimensions: RubricDimension[]
  values: Record<string, number>
  onChange: (values: Record<string, number>) => void
}

export default function RubricScoring({ dimensions, values, onChange }: RubricScoringProps) {
  function handleChange(dimension: string, score: number) {
    onChange({ ...values, [dimension]: score })
  }

  if (!dimensions || dimensions.length === 0) return null

  const scored = dimensions.filter(d => values[d.name] !== undefined).length

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-800">Rubric Scoring</h3>
        <span className="text-xs text-gray-500">
          {scored}/{dimensions.length} scored
        </span>
      </div>

      <div className="space-y-3">
        {dimensions.map(dim => (
          <div key={dim.name} className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700">{dim.name}</label>
              {values[dim.name] !== undefined && (
                <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                  {values[dim.name]}/{dim.scale}
                </span>
              )}
            </div>
            <div className="flex gap-2">
              {Array.from({ length: dim.scale }, (_, i) => i + 1).map(score => (
                <button
                  key={score}
                  type="button"
                  onClick={() => handleChange(dim.name, score)}
                  className={`flex-1 h-9 rounded-lg text-sm font-medium transition-all ${
                    values[dim.name] === score
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {score}
                </button>
              ))}
            </div>
            <div className="flex justify-between text-xs text-gray-400">
              <span>Poor</span>
              <span>Excellent</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
