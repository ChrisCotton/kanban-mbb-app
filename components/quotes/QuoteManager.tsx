'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import QuoteForm from './QuoteForm'
import type { InspirationalQuote } from '../../lib/database/quotes-queries'
import {
  mergeQuotesWithDefaults,
  isDefaultQuoteId,
} from '../../lib/quotes/merge-quotes-with-defaults'

interface QuoteManagerProps {
  userId: string
  className?: string
}

const PAGE_SIZE_OPTIONS = [5, 10, 20] as const
type PageSize = (typeof PAGE_SIZE_OPTIONS)[number]

type ManagedQuote = {
  id: string
  text: string
  author: string | null
  isDefault: boolean
  is_active: boolean
  personal?: InspirationalQuote
}

const QuoteManager: React.FC<QuoteManagerProps> = ({ userId, className = '' }) => {
  const [quotes, setQuotes] = useState<InspirationalQuote[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pageSize, setPageSize] = useState<PageSize>(5)
  const [page, setPage] = useState(1)

  const loadQuotes = useCallback(async () => {
    try {
      const res = await fetch(`/api/quotes?user_id=${userId}`)
      const result = await res.json()
      if (!res.ok) throw new Error(result.error || 'Failed to load quotes')
      setQuotes(result.data || [])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    loadQuotes()
  }, [loadQuotes])

  const personalById = useMemo(
    () => new Map(quotes.map((q) => [q.id, q])),
    [quotes]
  )

  const allQuotes: ManagedQuote[] = useMemo(() => {
    const personalDisplay = quotes.map((q) => ({
      id: q.id,
      text: q.text,
      author: q.author,
    }))
    return mergeQuotesWithDefaults(personalDisplay).map((q) => {
      const personal = personalById.get(q.id)
      return {
        id: q.id,
        text: q.text,
        author: q.author ?? null,
        isDefault: isDefaultQuoteId(q.id),
        is_active: personal?.is_active ?? true,
        personal,
      }
    })
  }, [quotes, personalById])

  const totalPages = Math.max(1, Math.ceil(allQuotes.length / pageSize))
  const currentPage = Math.min(page, totalPages)

  useEffect(() => {
    setPage(1)
  }, [pageSize, allQuotes.length])

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages)
    }
  }, [page, totalPages])

  const paginatedQuotes = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return allQuotes.slice(start, start + pageSize)
  }, [allQuotes, currentPage, pageSize])

  const handleCreate = async (values: { text: string; author: string }) => {
    const res = await fetch('/api/quotes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: userId,
        text: values.text,
        author: values.author || null,
        is_active: true,
      }),
    })
    const result = await res.json()
    if (!res.ok) throw new Error(result.error || 'Failed to create quote')
    await loadQuotes()
  }

  const handleUpdate = async (quoteId: string, values: { text: string; author: string }) => {
    const res = await fetch(`/api/quotes/${quoteId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: userId,
        text: values.text,
        author: values.author || null,
      }),
    })
    const result = await res.json()
    if (!res.ok) throw new Error(result.error || 'Failed to update quote')
    setEditingId(null)
    await loadQuotes()
  }

  const handleToggleActive = async (quote: InspirationalQuote) => {
    const action = quote.is_active ? 'deactivate' : 'activate'
    const res = await fetch(`/api/quotes/${quote.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, action }),
    })
    const result = await res.json()
    if (!res.ok) throw new Error(result.error || 'Failed to toggle quote')
    await loadQuotes()
  }

  const handleDelete = async (quoteId: string) => {
    if (!window.confirm('Delete this quote?')) return

    const res = await fetch(`/api/quotes/${quoteId}?user_id=${userId}`, {
      method: 'DELETE',
    })
    const result = await res.json()
    if (!res.ok) throw new Error(result.error || 'Failed to delete quote')
    await loadQuotes()
  }

  const handleMove = async (quote: InspirationalQuote, direction: 'up' | 'down') => {
    const index = quotes.findIndex((q) => q.id === quote.id)
    if (index === -1) return

    const swapIndex = direction === 'up' ? index - 1 : index + 1
    if (swapIndex < 0 || swapIndex >= quotes.length) return

    const otherQuote = quotes[swapIndex]

    await Promise.all([
      fetch(`/api/quotes/${quote.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          action: 'reorder',
          display_order: otherQuote.display_order,
        }),
      }),
      fetch(`/api/quotes/${otherQuote.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          action: 'reorder',
          display_order: quote.display_order,
        }),
      }),
    ])

    await loadQuotes()
  }

  const activePersonalCount = quotes.filter((q) => q.is_active).length
  const personalCount = quotes.length
  const curatedCount = allQuotes.length - personalCount
  const rangeStart = allQuotes.length === 0 ? 0 : (currentPage - 1) * pageSize + 1
  const rangeEnd = Math.min(currentPage * pageSize, allQuotes.length)

  if (loading) {
    return (
      <div className={`text-white/60 text-center py-8 ${className}`}>
        Loading quotes...
      </div>
    )
  }

  return (
    <div className={className}>
      {error && (
        <div className="mb-4 p-3 bg-red-500/20 border border-red-400/30 rounded-lg text-red-300 text-sm">
          {error}
        </div>
      )}

      <div className="mb-6">
        <QuoteForm onSubmit={handleCreate} submitLabel="Add Quote" />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h3 className="text-lg font-medium text-white">Your Quotes</h3>
        <span className="text-sm text-white/60">
          {allQuotes.length} total ({personalCount} personal, {curatedCount} curated),{' '}
          {activePersonalCount} personal active in strip
        </span>
      </div>

      {allQuotes.length === 0 ? (
        <p className="text-white/60 text-sm py-4">
          No quotes available yet. Add a personal quote above.
        </p>
      ) : (
        <>
          <ul className="space-y-3">
            {paginatedQuotes.map((quote) => {
              const globalIndex = quotes.findIndex((q) => q.id === quote.id)

              return (
                <li
                  key={quote.id}
                  className={`p-4 rounded-lg border ${
                    quote.isDefault
                      ? 'bg-white/5 border-white/10'
                      : quote.is_active
                        ? 'bg-white/10 border-white/20'
                        : 'bg-white/5 border-white/10 opacity-70'
                  }`}
                >
                  {editingId === quote.id && quote.personal ? (
                    <QuoteForm
                      initialValues={{
                        text: quote.text,
                        author: quote.author || '',
                      }}
                      onSubmit={(values) => handleUpdate(quote.id, values)}
                      onCancel={() => setEditingId(null)}
                      submitLabel="Save Changes"
                    />
                  ) : (
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <p className="text-white italic">&ldquo;{quote.text}&rdquo;</p>
                        {quote.author && (
                          <p className="text-white/60 text-sm mt-1">&mdash; {quote.author}</p>
                        )}
                        <div className="flex flex-wrap gap-2 mt-2">
                          {quote.isDefault && (
                            <span className="inline-block text-xs text-blue-300/90 bg-blue-500/10 px-2 py-0.5 rounded">
                              Curated default
                            </span>
                          )}
                          {!quote.isDefault && !quote.is_active && (
                            <span className="inline-block text-xs text-yellow-400/80">
                              Inactive
                            </span>
                          )}
                        </div>
                      </div>

                      {!quote.isDefault && quote.personal && (
                        <div className="flex flex-shrink-0 gap-1">
                          <button
                            type="button"
                            onClick={() => handleMove(quote.personal!, 'up')}
                            disabled={globalIndex === 0}
                            aria-label="Move up"
                            className="p-1.5 text-white/60 hover:text-white disabled:opacity-30 transition-colors"
                          >
                            ↑
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMove(quote.personal!, 'down')}
                            disabled={globalIndex === quotes.length - 1}
                            aria-label="Move down"
                            className="p-1.5 text-white/60 hover:text-white disabled:opacity-30 transition-colors"
                          >
                            ↓
                          </button>
                          <button
                            type="button"
                            onClick={() => handleToggleActive(quote.personal!)}
                            aria-label={quote.is_active ? 'Deactivate quote' : 'Activate quote'}
                            title={quote.is_active ? 'Deactivate' : 'Activate'}
                            className="p-1.5 text-white/60 hover:text-white transition-colors"
                          >
                            {quote.is_active ? '👁' : '👁‍🗨'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingId(quote.id)}
                            aria-label="Edit quote"
                            className="p-1.5 text-white/60 hover:text-white transition-colors"
                          >
                            ✎
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(quote.id)}
                            aria-label="Delete quote"
                            className="p-1.5 text-red-400/70 hover:text-red-400 transition-colors"
                          >
                            ✕
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </li>
              )
            })}
          </ul>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-4">
            <div className="flex items-center gap-2 text-sm text-white/70">
              <label htmlFor="quotes-page-size" className="whitespace-nowrap">
                Per page
              </label>
              <select
                id="quotes-page-size"
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value) as PageSize)}
                className="bg-white/10 border border-white/20 rounded-lg px-2 py-1.5 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                {PAGE_SIZE_OPTIONS.map((size) => (
                  <option key={size} value={size} className="bg-slate-900">
                    {size}
                  </option>
                ))}
              </select>
            </div>

            <p className="text-sm text-white/60">
              Showing {rangeStart}&ndash;{rangeEnd} of {allQuotes.length}
            </p>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
                className="px-3 py-1.5 text-sm bg-white/10 hover:bg-white/20 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
              >
                Previous
              </button>
              <span className="text-sm text-white/70 min-w-[5rem] text-center">
                Page {currentPage} of {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                className="px-3 py-1.5 text-sm bg-white/10 hover:bg-white/20 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default QuoteManager
