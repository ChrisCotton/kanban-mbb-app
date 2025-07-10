import { useState, useCallback } from 'react'
import { Task } from '../lib/database/kanban-queries'
import { SearchFilters } from '../components/kanban/SearchAndFilter'

interface UseTaskSearchOptions {
  onError?: (error: string) => void
}

export const useTaskSearch = (options: UseTaskSearchOptions = {}) => {
  const [searchResults, setSearchResults] = useState<Task[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [activeFilters, setActiveFilters] = useState<SearchFilters>({})
  const [isSearchMode, setIsSearchMode] = useState(false)

  // Perform search with filters
  const performSearch = useCallback(async (filters: SearchFilters) => {
    setIsSearching(true)
    setSearchError(null)
    
    try {
      // Build query parameters
      const params = new URLSearchParams()
      
      if (filters.query) params.append('q', filters.query)
      if (filters.status) params.append('status', filters.status)
      if (filters.priority) params.append('priority', filters.priority)
      if (filters.category) params.append('category', filters.category)
      if (filters.tags && filters.tags.length > 0) {
        filters.tags.forEach(tag => params.append('tags', tag))
      }
      if (filters.overdue) params.append('overdue', 'true')
      if (filters.dateRange?.start) params.append('start_date', filters.dateRange.start)
      if (filters.dateRange?.end) params.append('end_date', filters.dateRange.end)

      const response = await fetch(`/api/kanban/tasks/search?${params.toString()}`)
      
      if (!response.ok) {
        throw new Error(`Search failed: ${response.statusText}`)
      }

      const data = await response.json()
      
      if (!data.success) {
        throw new Error(data.error || 'Search failed')
      }

      setSearchResults(data.data)
      setActiveFilters(filters)
      setIsSearchMode(true)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Search failed'
      setSearchError(errorMessage)
      options.onError?.(errorMessage)
    } finally {
      setIsSearching(false)
    }
  }, [options])

  // Clear search and return to normal view
  const clearSearch = useCallback(() => {
    setSearchResults([])
    setActiveFilters({})
    setIsSearchMode(false)
    setSearchError(null)
  }, [])

  // Check if any filters are active
  const hasActiveFilters = Object.values(activeFilters).some(value => 
    value !== undefined && value !== '' && (!Array.isArray(value) || value.length > 0)
  )

  // Organize search results by status for kanban display
  const organizedResults = {
    backlog: searchResults.filter(task => task.status === 'backlog'),
    todo: searchResults.filter(task => task.status === 'todo'),
    doing: searchResults.filter(task => task.status === 'doing'),
    done: searchResults.filter(task => task.status === 'done')
  }

  // Search stats
  const searchStats = {
    total: searchResults.length,
    backlog: organizedResults.backlog.length,
    todo: organizedResults.todo.length,
    doing: organizedResults.doing.length,
    done: organizedResults.done.length
  }

  return {
    // Search state
    searchResults,
    organizedResults,
    searchStats,
    isSearching,
    searchError,
    activeFilters,
    isSearchMode,
    hasActiveFilters,
    
    // Search actions
    performSearch,
    clearSearch,
    
    // Helper methods
    clearError: () => setSearchError(null)
  }
} 