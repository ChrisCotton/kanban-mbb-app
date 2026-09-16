'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import defaultQuotesData from '../../lib/data/default-quotes.json'
import type { DisplayQuote } from '../../lib/database/quotes-queries'

interface InspirationalQuotesStripProps {
  userId?: string
  quotes?: DisplayQuote[]
  autoAdvanceInterval?: number
  className?: string
}

const DEFAULT_QUOTES: DisplayQuote[] = defaultQuotesData.map((q) => ({
  id: q.id,
  text: q.text,
  author: q.author,
}))

const InspirationalQuotesStrip: React.FC<InspirationalQuotesStripProps> = ({
  userId,
  quotes: quotesProp,
  autoAdvanceInterval = 11000,
  className = '',
}) => {
  const [loadedQuotes, setLoadedQuotes] = useState<DisplayQuote[]>([])
  const [loading, setLoading] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isPaused, setIsPaused] = useState(false)

  useEffect(() => {
    if (quotesProp) {
      setLoadedQuotes(quotesProp)
      return
    }

    if (!userId) {
      setLoadedQuotes(DEFAULT_QUOTES)
      return
    }

    let cancelled = false
    setLoading(true)

    fetch(`/api/quotes?user_id=${userId}&active_only=true`)
      .then((res) => res.json())
      .then((result) => {
        if (cancelled) return
        const userQuotes: DisplayQuote[] = (result.data || []).map(
          (q: { id: string; text: string; author?: string | null }) => ({
            id: q.id,
            text: q.text,
            author: q.author,
          })
        )
        setLoadedQuotes(userQuotes.length > 0 ? userQuotes : DEFAULT_QUOTES)
      })
      .catch((err) => {
        if (!cancelled) {
          console.error('Error loading quotes:', err)
          setLoadedQuotes(DEFAULT_QUOTES)
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [userId, quotesProp])

  const displayQuotes = useMemo(() => loadedQuotes, [loadedQuotes])
  const totalQuotes = displayQuotes.length

  const goToNext = useCallback(() => {
    if (totalQuotes <= 1) return
    setCurrentIndex((prev) => (prev + 1) % totalQuotes)
  }, [totalQuotes])

  const goToPrevious = useCallback(() => {
    if (totalQuotes <= 1) return
    setCurrentIndex((prev) => (prev - 1 + totalQuotes) % totalQuotes)
  }, [totalQuotes])

  const goToSlide = useCallback(
    (index: number) => {
      if (index === currentIndex || totalQuotes <= 1) return
      setCurrentIndex(index)
    },
    [currentIndex, totalQuotes]
  )

  useEffect(() => {
    setCurrentIndex(0)
  }, [displayQuotes])

  useEffect(() => {
    if (totalQuotes <= 1 || isPaused) return

    const interval = setInterval(goToNext, autoAdvanceInterval)
    return () => clearInterval(interval)
  }, [goToNext, autoAdvanceInterval, totalQuotes, isPaused])

  if (loading) {
    return null
  }

  if (totalQuotes === 0) {
    return null
  }

  const currentQuote = displayQuotes[currentIndex]

  return (
    <div
      data-testid="inspirational-quotes-strip"
      className={`h-14 bg-black/30 backdrop-blur-md border-b border-white/10 flex items-center px-4 relative ${className}`}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {totalQuotes > 1 && (
        <button
          type="button"
          onClick={goToPrevious}
          aria-label="Previous quote"
          className="flex-shrink-0 p-1 text-white/60 hover:text-white transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
      )}

      <div className="flex-1 min-w-0 px-2 text-center">
        <p className="text-white/90 italic text-sm truncate">
          &ldquo;{currentQuote.text}&rdquo;
          {currentQuote.author && (
            <span className="not-italic text-white/60 ml-1">
              &mdash; {currentQuote.author}
            </span>
          )}
        </p>
      </div>

      {totalQuotes > 1 && (
        <button
          type="button"
          onClick={goToNext}
          aria-label="Next quote"
          className="flex-shrink-0 p-1 text-white/60 hover:text-white transition-colors"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      )}

      {totalQuotes > 1 && (
        <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-1">
          {displayQuotes.map((quote, index) => (
            <button
              key={quote.id}
              type="button"
              aria-label={`Go to quote ${index + 1}`}
              onClick={() => goToSlide(index)}
              className={`w-1.5 h-1.5 rounded-full transition-colors ${
                index === currentIndex ? 'bg-white/80' : 'bg-white/30 hover:bg-white/50'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default InspirationalQuotesStrip
