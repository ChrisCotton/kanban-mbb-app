import { useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'

interface UseRealtimeAnalyticsOptions {
  userId?: string
  onUpdate: () => void
  debounceMs?: number
  enabled?: boolean
}

/**
 * Hook that subscribes to time_sessions table changes via Supabase Realtime
 * and triggers analytics refresh when sessions are created/updated/deleted.
 * Includes debouncing to avoid excessive API requests.
 */
export function useRealtimeAnalytics({
  userId,
  onUpdate,
  debounceMs = 1000,
  enabled = true
}: UseRealtimeAnalyticsOptions) {
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const onUpdateRef = useRef(onUpdate)

  // Keep the callback ref up to date
  useEffect(() => {
    onUpdateRef.current = onUpdate
  }, [onUpdate])

  // Debounced update function
  const debouncedUpdate = useCallback(() => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current)
    }

    debounceTimeoutRef.current = setTimeout(() => {
      onUpdateRef.current()
    }, debounceMs)
  }, [debounceMs])

  useEffect(() => {
    if (!enabled || !userId) return

    // Subscribe to time_sessions table changes for this user
    const channel = supabase
      .channel(`time_sessions_analytics_${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'time_sessions',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          console.log('📊 New time session detected, refreshing analytics', payload)
          debouncedUpdate()
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'time_sessions',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          // Only refresh if session ended (ended_at changed from null to a value)
          const newRecord = payload.new as any
          const oldRecord = payload.old as any
          
          if (newRecord.ended_at && !oldRecord?.ended_at) {
            console.log('📊 Time session completed, refreshing analytics', payload)
            debouncedUpdate()
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'time_sessions',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          console.log('📊 Time session deleted, refreshing analytics', payload)
          debouncedUpdate()
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('📊 Subscribed to time_sessions changes for analytics')
        } else if (status === 'CHANNEL_ERROR') {
          console.error('📊 Failed to subscribe to time_sessions changes')
        }
      })

    // Cleanup subscription on unmount
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current)
      }
      supabase.removeChannel(channel)
    }
  }, [userId, enabled, debouncedUpdate])

  // Return a manual refresh function
  return {
    refresh: onUpdateRef.current
  }
}

export default useRealtimeAnalytics
