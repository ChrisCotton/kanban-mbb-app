'use client'

import React, { useState, useEffect, useCallback } from 'react'
import QuoteForm from './QuoteForm'
import type { InspirationalQuote } from '../../lib/database/quotes-queries'

interface QuoteManagerProps {
  userId: string
  className?: string
}

const QuoteManager: React.FC<QuoteManagerProps> = ({ userId, className = '' }) => {
  const [quotes, setQuotes] = useState<InspirationalQuote[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

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

  const activeCount = quotes.filter((q) => q.is_active).length

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

      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-white">Your Quotes</h3>
        <span className="text-sm text-white/60">
          {quotes.length} total, {activeCount} active in strip
        </span>
      </div>

      {quotes.length === 0 ? (
        <p className="text-white/60 text-sm py-4">
          No personal quotes yet. Add one above — curated defaults always rotate in the strip too.
        </p>
      ) : (
        <ul className="space-y-3">
          {quotes.map((quote, index) => (
            <li
              key={quote.id}
              className={`p-4 rounded-lg border ${
                quote.is_active
                  ? 'bg-white/10 border-white/20'
                  : 'bg-white/5 border-white/10 opacity-70'
              }`}
            >
              {editingId === quote.id ? (
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
                    {!quote.is_active && (
                      <span className="inline-block mt-2 text-xs text-yellow-400/80">Inactive</span>
                    )}
                  </div>

                  <div className="flex flex-shrink-0 gap-1">
                    <button
                      type="button"
                      onClick={() => handleMove(quote, 'up')}
                      disabled={index === 0}
                      aria-label="Move up"
                      className="p-1.5 text-white/60 hover:text-white disabled:opacity-30 transition-colors"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMove(quote, 'down')}
                      disabled={index === quotes.length - 1}
                      aria-label="Move down"
                      className="p-1.5 text-white/60 hover:text-white disabled:opacity-30 transition-colors"
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleActive(quote)}
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
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default QuoteManager
