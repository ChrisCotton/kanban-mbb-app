'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'

interface JournalEntry {
  id: string
  title: string
  content: string
  audio_file_path?: string
  audio_duration?: number
  transcription_status: 'pending' | 'processing' | 'completed' | 'failed'
  created_at: string
  updated_at: string
}

interface TranscriptEditorProps {
  entry: JournalEntry
  onSave: (title: string, content: string) => void
  onCancel: () => void
  onDelete: () => void
  className?: string
}

type ViewMode = 'edit' | 'preview'

const TranscriptEditor: React.FC<TranscriptEditorProps> = ({
  entry,
  onSave,
  onCancel,
  onDelete,
  className = ''
}) => {
  const [title, setTitle] = useState(entry.title)
  const [content, setContent] = useState(entry.content)
  const [viewMode, setViewMode] = useState<ViewMode>('edit')
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(entry.audio_duration || 0)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const audioRef = useRef<HTMLAudioElement | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)

  // Check for unsaved changes
  useEffect(() => {
    const titleChanged = title !== entry.title
    const contentChanged = content !== entry.content
    setHasUnsavedChanges(titleChanged || contentChanged)
  }, [title, content, entry.title, entry.content])

  // Auto-resize textarea
  const autoResizeTextarea = useCallback(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
    }
  }, [])

  useEffect(() => {
    autoResizeTextarea()
  }, [content, autoResizeTextarea])

  // Handle audio playback
  const togglePlayback = useCallback(() => {
    if (!audioRef.current) return

    if (isPlaying) {
      audioRef.current.pause()
    } else {
      audioRef.current.play()
    }
  }, [isPlaying])

  const handleTimeUpdate = useCallback(() => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime)
    }
  }, [])

  const handleLoadedMetadata = useCallback(() => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration)
    }
  }, [])

  const handleAudioEnded = useCallback(() => {
    setIsPlaying(false)
    setCurrentTime(0)
  }, [])

  const seekTo = useCallback((time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time
      setCurrentTime(time)
    }
  }, [])

  // Format time for display
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Handle markdown formatting
  const insertMarkdown = useCallback((syntax: string, placeholder: string = '') => {
    if (!textareaRef.current) return

    const textarea = textareaRef.current
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selectedText = content.substring(start, end)
    
    let newText = ''
    let cursorOffset = 0

    switch (syntax) {
      case 'bold':
        newText = `**${selectedText || placeholder}**`
        cursorOffset = selectedText ? 0 : 2
        break
      case 'italic':
        newText = `*${selectedText || placeholder}*`
        cursorOffset = selectedText ? 0 : 1
        break
      case 'heading':
        newText = `## ${selectedText || placeholder}`
        cursorOffset = selectedText ? 0 : 3
        break
      case 'list':
        newText = `- ${selectedText || placeholder}`
        cursorOffset = selectedText ? 0 : 2
        break
      case 'quote':
        newText = `> ${selectedText || placeholder}`
        cursorOffset = selectedText ? 0 : 2
        break
      case 'code':
        newText = `\`${selectedText || placeholder}\``
        cursorOffset = selectedText ? 0 : 1
        break
      case 'link':
        newText = `[${selectedText || 'link text'}](url)`
        cursorOffset = selectedText ? newText.length - 5 : 1
        break
      default:
        return
    }

    const newContent = content.substring(0, start) + newText + content.substring(end)
    setContent(newContent)

    // Set cursor position
    setTimeout(() => {
      const newCursorPos = start + newText.length - cursorOffset
      textarea.focus()
      textarea.setSelectionRange(newCursorPos, newCursorPos)
    }, 0)
  }, [content])

  // Handle save
  const handleSave = useCallback(() => {
    onSave(title.trim(), content.trim())
    setHasUnsavedChanges(false)
  }, [title, content, onSave])

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.ctrlKey || e.metaKey) {
      switch (e.key) {
        case 's':
          e.preventDefault()
          handleSave()
          break
        case 'b':
          e.preventDefault()
          insertMarkdown('bold', 'bold text')
          break
        case 'i':
          e.preventDefault()
          insertMarkdown('italic', 'italic text')
          break
      }
    }
  }, [handleSave, insertMarkdown])

  // Render markdown preview
  const renderMarkdownPreview = (text: string) => {
    // Simple markdown rendering - in production, use a proper markdown parser
    return text
      .replace(/^## (.*$)/gm, '<h2 class="text-xl font-bold mb-2">$1</h2>')
      .replace(/^# (.*$)/gm, '<h1 class="text-2xl font-bold mb-3">$1</h1>')
      .replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold">$1</strong>')
      .replace(/\*(.*?)\*/g, '<em class="italic">$1</em>')
      .replace(/`(.*?)`/g, '<code class="bg-gray-100 px-1 rounded">$1</code>')
      .replace(/^> (.*$)/gm, '<blockquote class="border-l-4 border-white/20 pl-4 italic">$1</blockquote>')
      .replace(/^- (.*$)/gm, '<li class="ml-4">• $1</li>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-blue-600 hover:underline" target="_blank">$1</a>')
      .replace(/\n/g, '<br>')
  }

  return (
    <div className={`${className} space-y-6`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h3 className="text-lg font-medium text-white">Edit Journal Entry</h3>
          {hasUnsavedChanges && (
            <span className="text-sm text-orange-400 bg-orange-500/20 px-2 py-1 rounded">
              Unsaved changes
            </span>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setViewMode('edit')}
            className={`px-3 py-1 text-sm rounded transition-colors ${
              viewMode === 'edit' 
                ? 'bg-blue-500 text-white' 
                : 'bg-white/10 text-white hover:bg-white/20'
            }`}
          >
            Edit
          </button>
          <button
            onClick={() => setViewMode('preview')}
            className={`px-3 py-1 text-sm rounded transition-colors ${
              viewMode === 'preview' 
                ? 'bg-blue-500 text-white' 
                : 'bg-white/10 text-white hover:bg-white/20'
            }`}
          >
            Preview
          </button>
        </div>
      </div>

      {/* Audio Player */}
      {entry.audio_file_path && (
        <div className="bg-white/10 rounded-lg p-4">
          <div className="flex items-center space-x-4">
            <button
              onClick={togglePlayback}
              className="bg-blue-500 hover:bg-blue-600 text-white p-2 rounded-full transition-colors"
            >
              {isPlaying ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h.01M15 14h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
            </button>
            
            <div className="flex-1">
              <div className="flex items-center justify-between text-sm text-white/70 mb-1">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
              <div className="w-full bg-white/20 rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full transition-all duration-200"
                  style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
                ></div>
              </div>
              <input
                type="range"
                min="0"
                max={duration}
                value={currentTime}
                onChange={(e) => seekTo(Number(e.target.value))}
                className="w-full mt-1 opacity-0 cursor-pointer"
                style={{ height: '8px', marginTop: '-10px' }}
              />
            </div>
          </div>
          
          <audio
            ref={audioRef}
            src={entry.audio_file_path}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onEnded={handleAudioEnded}
            className="hidden"
          />
        </div>
      )}

      {/* Title Input */}
      <div>
        <label className="block text-sm font-medium text-white/90 mb-2">
          Title
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:ring-2 focus:ring-blue-400 focus:border-transparent"
          placeholder="Enter journal entry title..."
        />
      </div>

      {/* Content Editor */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-white/90">
            Content
          </label>
          <div className="text-xs text-white/70">
            Supports Markdown formatting
          </div>
        </div>

        {viewMode === 'edit' && (
          <>
            {/* Markdown Toolbar */}
            <div className="border border-white/20 rounded-t-lg bg-white/10 px-3 py-2 flex items-center space-x-2">
              <button
                onClick={() => insertMarkdown('bold', 'bold text')}
                className="p-1 hover:bg-white/20 rounded text-white/70 hover:text-white"
                title="Bold (Ctrl+B)"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 4h8a4 4 0 014 4 4 4 0 01-4 4H6z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 12h9a4 4 0 014 4 4 4 0 01-4 4H6z" />
                </svg>
              </button>
              <button
                onClick={() => insertMarkdown('italic', 'italic text')}
                className="p-1 hover:bg-white/20 rounded text-white/70 hover:text-white"
                title="Italic (Ctrl+I)"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 4l4 16m-4-8h4" />
                </svg>
              </button>
              <button
                onClick={() => insertMarkdown('heading', 'Heading')}
                className="p-1 hover:bg-white/20 rounded text-white/70 hover:text-white"
                title="Heading"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <button
                onClick={() => insertMarkdown('list', 'List item')}
                className="p-1 hover:bg-white/20 rounded text-white/70 hover:text-white"
                title="List"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
              </button>
              <button
                onClick={() => insertMarkdown('quote', 'Quote')}
                className="p-1 hover:bg-white/20 rounded text-white/70 hover:text-white"
                title="Quote"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </button>
              <button
                onClick={() => insertMarkdown('code', 'code')}
                className="p-1 hover:bg-white/20 rounded text-white/70 hover:text-white"
                title="Code"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                </svg>
              </button>
              <button
                onClick={() => insertMarkdown('link', 'link text')}
                className="p-1 hover:bg-white/20 rounded text-white/70 hover:text-white"
                title="Link"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
              </button>
            </div>

            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full px-3 py-3 border border-white/20 border-t-0 rounded-b-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none min-h-64"
              placeholder="Start typing your journal entry... You can use Markdown formatting."
            />
          </>
        )}

        {viewMode === 'preview' && (
          <div className="border border-white/20 rounded-lg p-4 min-h-64 bg-white">
            <div 
              className="prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: renderMarkdownPreview(content) }}
            />
          </div>
        )}
      </div>

      {/* Transcription Status */}
      {entry.transcription_status !== 'completed' && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-yellow-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-yellow-800">
              Transcription status: {entry.transcription_status}
              {entry.transcription_status === 'processing' && ' - This may take a few minutes.'}
              {entry.transcription_status === 'failed' && ' - You can edit the content manually.'}
            </span>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <button
            onClick={onCancel}
            className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            Cancel
          </button>
          
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            Delete
          </button>
        </div>
        
        <button
          onClick={handleSave}
          disabled={!hasUnsavedChanges}
          className={`px-6 py-2 rounded-lg font-medium transition-colors ${
            hasUnsavedChanges
              ? 'bg-blue-500 hover:bg-blue-600 text-white'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          Save Changes
        </button>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-bold mb-4">Delete Journal Entry</h3>
            <p className="text-white/70 mb-6">
              Are you sure you want to delete this journal entry? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onDelete()
                  setShowDeleteConfirm(false)
                }}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default TranscriptEditor 