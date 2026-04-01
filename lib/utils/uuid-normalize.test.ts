import { parseUuidOrNull, parseUuidArray } from './uuid-normalize'

const valid = '550e8400-e29b-41d4-a716-446655440000'

describe('uuid-normalize', () => {
  describe('parseUuidOrNull', () => {
    it('accepts valid UUIDs', () => {
      expect(parseUuidOrNull(valid)).toBe(valid.toLowerCase())
    })

    it('maps nullish and sentinel strings to null', () => {
      expect(parseUuidOrNull(null)).toBe(null)
      expect(parseUuidOrNull(undefined)).toBe(null)
      expect(parseUuidOrNull('')).toBe(null)
      expect(parseUuidOrNull('null')).toBe(null)
      expect(parseUuidOrNull('undefined')).toBe(null)
      expect(parseUuidOrNull('  null  ')).toBe(null)
    })

    it('rejects malformed strings', () => {
      expect(parseUuidOrNull('not-a-uuid')).toBe(null)
    })
  })

  describe('parseUuidArray', () => {
    it('filters to valid UUIDs', () => {
      expect(parseUuidArray([valid, 'null', '', valid])).toEqual([
        valid.toLowerCase(),
        valid.toLowerCase(),
      ])
    })

    it('handles non-arrays', () => {
      expect(parseUuidArray(null)).toEqual([])
    })
  })
})
