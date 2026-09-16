'use client'

import React, { useState } from 'react'

export interface QuoteFormValues {
  text: string
  author: string
}

interface QuoteFormProps {
  initialValues?: QuoteFormValues
  onSubmit: (values: QuoteFormValues) => Promise<void>
  onCancel?: () => void
  submitLabel?: string
}

const QuoteForm: React.FC<QuoteFormProps> = ({
  initialValues = { text: '', author: '' },
  onSubmit,
  onCancel,
  submitLabel = 'Add Quote',
}) => {
  const [text, setText] = useState(initialValues.text)
  const [author, setAuthor] = useState(initialValues.author)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!text.trim()) {
      setError('Quote text is required')
      return
    }

    if (text.trim().length > 500) {
      setError('Quote text must be 500 characters or less')
      return
    }

    if (author.trim().length > 200) {
      setError('Author must be 200 characters or less')
      return
    }

    setSubmitting(true)
    try {
      await onSubmit({ text: text.trim(), author: author.trim() })
      if (!initialValues.text) {
        setText('')
        setAuthor('')
      }
    } catch (err: any) {
      setError(err.message || 'Failed to save quote')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="quote-text" className="block text-sm font-medium text-white/80 mb-1">
          Quote
        </label>
        <textarea
          id="quote-text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Enter your inspirational quote..."
          rows={3}
          maxLength={500}
          className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
        />
        <div className="text-xs text-white/40 mt-1 text-right">{text.length}/500</div>
      </div>

      <div>
        <label htmlFor="quote-author" className="block text-sm font-medium text-white/80 mb-1">
          Author (optional)
        </label>
        <input
          id="quote-author"
          type="text"
          value={author}
          onChange={(e) => setAuthor(e.target.value)}
          placeholder="Who said it?"
          maxLength={200}
          className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500"
        />
      </div>

      {error && (
        <p className="text-red-400 text-sm">{error}</p>
      )}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={submitting}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-medium rounded-lg transition-colors"
        >
          {submitting ? 'Saving...' : submitLabel}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white font-medium rounded-lg transition-colors"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  )
}

export default QuoteForm
