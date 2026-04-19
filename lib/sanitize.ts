export type SanitizeResult = {
  value: string
  flagged: boolean
}

const INJECTION_PATTERNS = [
  /ignore\s+(previous|all|above)\s+(instructions?|prompts?|context)/gi,
  /system\s*:/gi,
  /\[INST\]/gi,
  /<<SYS>>/gi,
  /<\|im_start\|>/gi,
  /you\s+are\s+now\s+(a\s+)?(?!an?\s+annotator)/gi,
  /forget\s+(everything|all|previous)/gi,
  /new\s+instructions?\s*:/gi,
  /override\s+(previous|all)\s+(instructions?|rules?)/gi,
]

export function sanitize(input: string): SanitizeResult {
  if (typeof input !== 'string') {
    return { value: '', flagged: false }
  }

  // Strip HTML tags
  let value = input.replace(/<[^>]*>/g, '')

  // Strip script content
  value = value.replace(/<script[\s\S]*?<\/script>/gi, '')

  // Decode common HTML entities back for display
  value = value
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")

  // Re-strip after decode
  value = value.replace(/<[^>]*>/g, '')

  // Trim excess whitespace
  value = value.trim()

  // Check for injection patterns
  let flagged = false
  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(value)) {
      flagged = true
      break
    }
  }

  return { value, flagged }
}

export function sanitizeObject<T extends Record<string, unknown>>(
  obj: T,
  fields: (keyof T)[]
): { sanitized: T; flagged: boolean } {
  const result = { ...obj }
  let anyFlagged = false

  for (const field of fields) {
    if (typeof result[field] === 'string') {
      const { value, flagged } = sanitize(result[field] as string)
      result[field] = value as T[keyof T]
      if (flagged) anyFlagged = true
    }
  }

  return { sanitized: result, flagged: anyFlagged }
}
