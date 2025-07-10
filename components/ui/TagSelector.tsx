import React, { useState, useRef, useEffect } from 'react'
import { Tag } from '../../pages/api/tags/index'
import { useTags } from '../../hooks/useTags'

interface TagSelectorProps {
  selectedTags: Tag[]
  onTagsChange: (tags: Tag[]) => void
  userId: string
  disabled?: boolean
  error?: string
  placeholder?: string
  className?: string
}

const TagSelector: React.FC<TagSelectorProps> = ({
  selectedTags,
  onTagsChange,
  userId,
  disabled = false,
  error,
  placeholder = "Select tags...",
  className = ""
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [isCreatingTag, setIsCreatingTag] = useState(false)
  const [newTagName, setNewTagName] = useState('')
  const [newTagColor, setNewTagColor] = useState('#3B82F6')
  
  const dropdownRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  
  const { tags: allTags, loading, createTag } = useTags(userId)

  // Filter tags based on search term and exclude already selected tags
  const availableTags = allTags.filter(tag => 
    !selectedTags.some(selected => selected.id === tag.id) &&
    tag.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Handle clicking outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        setIsCreatingTag(false)
        setSearchTerm('')
        setNewTagName('')
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Focus input when dropdown opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  const handleTagSelect = (tag: Tag) => {
    onTagsChange([...selectedTags, tag])
    setSearchTerm('')
    setIsOpen(false)
  }

  const handleTagRemove = (tagToRemove: Tag) => {
    onTagsChange(selectedTags.filter(tag => tag.id !== tagToRemove.id))
  }

  const handleCreateTag = async () => {
    if (!newTagName.trim()) return

    const createdTag = await createTag(newTagName.trim(), newTagColor)
    if (createdTag) {
      onTagsChange([...selectedTags, createdTag])
      setIsCreatingTag(false)
      setNewTagName('')
      setNewTagColor('#3B82F6')
      setSearchTerm('')
      setIsOpen(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (isCreatingTag) {
        handleCreateTag()
      } else if (availableTags.length > 0) {
        handleTagSelect(availableTags[0])
      } else if (searchTerm.trim()) {
        setIsCreatingTag(true)
        setNewTagName(searchTerm.trim())
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false)
      setIsCreatingTag(false)
      setSearchTerm('')
      setNewTagName('')
    }
  }

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Selected Tags Display */}
      <div 
        className={`
          min-h-[2.5rem] p-2 border rounded-lg bg-white dark:bg-gray-700 
          border-gray-300 dark:border-gray-600 cursor-text
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-gray-400 dark:hover:border-gray-500'}
          ${error ? 'border-red-500 dark:border-red-400' : ''}
          ${isOpen ? 'ring-2 ring-blue-500 border-blue-500' : ''}
        `}
        onClick={() => !disabled && setIsOpen(true)}
      >
        <div className="flex flex-wrap items-center gap-1">
          {/* Selected Tags */}
          {selectedTags.map((tag) => (
            <span
              key={tag.id}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium text-white"
              style={{ backgroundColor: tag.color }}
            >
              {tag.name}
              {!disabled && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleTagRemove(tag)
                  }}
                  className="ml-1 hover:bg-white/20 rounded-full p-0.5"
                  aria-label={`Remove ${tag.name} tag`}
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </span>
          ))}
          
          {/* Placeholder */}
          {selectedTags.length === 0 && !isOpen && (
            <span className="text-gray-500 dark:text-gray-400 text-sm">
              {placeholder}
            </span>
          )}
        </div>
      </div>

      {/* Dropdown */}
      {isOpen && !disabled && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-64 overflow-hidden">
          {/* Search Input */}
          <div className="p-2 border-b border-gray-200 dark:border-gray-600">
            <input
              ref={inputRef}
              type="text"
              value={isCreatingTag ? newTagName : searchTerm}
              onChange={(e) => {
                if (isCreatingTag) {
                  setNewTagName(e.target.value)
                } else {
                  setSearchTerm(e.target.value)
                }
              }}
              onKeyDown={handleKeyDown}
              placeholder={isCreatingTag ? "Enter tag name..." : "Search or create tags..."}
              className="w-full px-2 py-1 text-sm border-0 bg-transparent text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none"
            />
          </div>

          {/* Create New Tag Form */}
          {isCreatingTag && (
            <div className="p-3 border-b border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={newTagColor}
                    onChange={(e) => setNewTagColor(e.target.value)}
                    className="w-8 h-8 rounded border border-gray-300 dark:border-gray-600"
                    title="Choose tag color"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    Create tag: <strong>{newTagName}</strong>
                  </span>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleCreateTag}
                    className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    Create
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsCreatingTag(false)
                      setNewTagName('')
                      setNewTagColor('#3B82F6')
                    }}
                    className="px-3 py-1 text-xs bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-400 dark:hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-500"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Available Tags List */}
          <div className="max-h-40 overflow-y-auto">
            {loading ? (
              <div className="p-3 text-center text-gray-500 dark:text-gray-400">
                Loading tags...
              </div>
            ) : availableTags.length > 0 ? (
              availableTags.map((tag) => (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => handleTagSelect(tag)}
                  className="w-full px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-600 focus:outline-none focus:bg-gray-100 dark:focus:bg-gray-600 flex items-center gap-2"
                >
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: tag.color }}
                  />
                  <span className="text-sm text-gray-900 dark:text-white">{tag.name}</span>
                  {tag.task_count !== undefined && (
                    <span className="text-xs text-gray-500 dark:text-gray-400 ml-auto">
                      {tag.task_count} task{tag.task_count !== 1 ? 's' : ''}
                    </span>
                  )}
                </button>
              ))
            ) : searchTerm ? (
              <div className="p-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsCreatingTag(true)
                    setNewTagName(searchTerm.trim())
                  }}
                  className="w-full px-3 py-2 text-left text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"
                >
                  Create tag "{searchTerm.trim()}"
                </button>
              </div>
            ) : (
              <div className="p-3 text-center text-gray-500 dark:text-gray-400">
                No tags found
              </div>
            )}
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <p className="mt-1 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  )
}

export default TagSelector 