const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Accepts a real UUID string; rejects "", "null", "undefined", and malformed values. */
export function parseUuidOrNull(value: unknown): string | null {
  if (value === null || value === undefined) return null
  if (typeof value !== 'string') return null
  const t = value.trim().toLowerCase()
  if (t === '' || t === 'null' || t === 'undefined') return null
  return UUID_RE.test(t) ? t : null
}

export function parseUuidArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  const out: string[] = []
  for (const item of value) {
    const id = parseUuidOrNull(item)
    if (id) out.push(id)
  }
  return out
}
