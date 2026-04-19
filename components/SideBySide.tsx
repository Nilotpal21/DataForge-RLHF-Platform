'use client'

type SideBySideProps = {
  responseA: string
  responseB: string
  selected: 'A' | 'B' | 'tie' | null
  onSelect: (choice: 'A' | 'B' | 'tie') => void
  preferenceStrength?: string
  onStrengthChange?: (strength: string) => void
  showStrength?: boolean
}

function ResponseCard({
  label,
  content,
  selected,
  onClick,
}: {
  label: string
  content: string
  selected: boolean
  onClick: () => void
}) {
  return (
    <div
      onClick={onClick}
      className={`flex-1 rounded-xl border-2 cursor-pointer transition-all overflow-hidden ${
        selected
          ? 'border-blue-500 shadow-lg shadow-blue-100'
          : 'border-gray-200 hover:border-gray-300'
      }`}
    >
      <div className={`px-4 py-3 border-b flex items-center justify-between ${
        selected ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'
      }`}>
        <span className={`text-sm font-semibold ${selected ? 'text-blue-700' : 'text-gray-600'}`}>
          Response {label}
        </span>
        {selected && (
          <span className="flex items-center gap-1 text-xs font-medium text-blue-600">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            Selected
          </span>
        )}
      </div>
      <div className="p-4 min-h-48 text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">
        {content}
      </div>
    </div>
  )
}

export default function SideBySide({
  responseA,
  responseB,
  selected,
  onSelect,
  preferenceStrength,
  onStrengthChange,
  showStrength = true,
}: SideBySideProps) {
  const STRENGTHS = [
    { value: 'significantly', label: 'Significantly better' },
    { value: 'slightly', label: 'Slightly better' },
    { value: 'negligibly', label: 'Negligibly better' },
    { value: 'unsure', label: 'Unsure' },
  ]

  return (
    <div className="space-y-4">
      <div className="flex gap-4">
        <ResponseCard
          label="A"
          content={responseA}
          selected={selected === 'A'}
          onClick={() => onSelect('A')}
        />
        <ResponseCard
          label="B"
          content={responseB}
          selected={selected === 'B'}
          onClick={() => onSelect('B')}
        />
      </div>

      <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 space-y-3">
        <p className="text-sm font-medium text-gray-700">Which response is better?</p>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => onSelect('A')}
            className={`flex-1 py-2.5 rounded-lg text-sm font-medium border transition-all ${
              selected === 'A'
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-gray-700 border-gray-200 hover:border-blue-300 hover:text-blue-600'
            }`}
          >
            Response A is better
          </button>

          <button
            type="button"
            onClick={() => onSelect('tie')}
            className={`px-4 py-2.5 rounded-lg text-sm font-medium border transition-all ${
              selected === 'tie'
                ? 'bg-gray-700 text-white border-gray-700'
                : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400 hover:text-gray-700'
            }`}
          >
            Tie / Neither
          </button>

          <button
            type="button"
            onClick={() => onSelect('B')}
            className={`flex-1 py-2.5 rounded-lg text-sm font-medium border transition-all ${
              selected === 'B'
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-gray-700 border-gray-200 hover:border-blue-300 hover:text-blue-600'
            }`}
          >
            Response B is better
          </button>
        </div>

        {showStrength && selected && selected !== 'tie' && (
          <div className="pt-2 border-t border-gray-200">
            <p className="text-xs font-medium text-gray-600 mb-2">
              How much better is Response {selected}?
            </p>
            <div className="flex gap-2 flex-wrap">
              {STRENGTHS.map(s => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => onStrengthChange?.(s.value)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                    preferenceStrength === s.value
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
