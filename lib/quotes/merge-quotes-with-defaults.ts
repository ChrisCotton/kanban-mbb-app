import defaultQuotesData from '../data/default-quotes.json'
import type { DisplayQuote } from '../database/quotes-queries'

export const DEFAULT_QUOTES: DisplayQuote[] = defaultQuotesData.map((q) => ({
  id: q.id,
  text: q.text,
  author: q.author,
}))

const normalizeQuoteText = (text: string) => text.trim().toLowerCase()

/** Personal quotes first, then curated defaults (skipping duplicates by text). */
export const mergeQuotesWithDefaults = (userQuotes: DisplayQuote[]): DisplayQuote[] => {
  const seen = new Set(userQuotes.map((q) => normalizeQuoteText(q.text)))
  const defaultsToAdd = DEFAULT_QUOTES.filter(
    (q) => !seen.has(normalizeQuoteText(q.text))
  )
  return userQuotes.length > 0 ? [...userQuotes, ...defaultsToAdd] : DEFAULT_QUOTES
}

export const isDefaultQuoteId = (id: string) => id.startsWith('default-')
