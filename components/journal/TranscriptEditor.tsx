'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'

interface JournalEntry {
  id: string
  user_id?: string
  title: string
  transcription?: string
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
  embedded?: boolean // When true, hides header and some controls for side-by-side view
}

type ViewMode = 'edit' | 'preview'

const TranscriptEditor: React.FC<TranscriptEditorProps> = ({
  entry,
  onSave,
  onCancel,
  onDelete,
  className = '',
  embedded = false
}) => {
  const [title, setTitle] = useState(entry.title)
  const [content, setContent] = useState(entry.transcription || '')
  const [viewMode, setViewMode] = useState<ViewMode>('edit')
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  const textareaRef = useRef<HTMLTextAreaElement | null>(null)

  // Sync with entry prop changes
  useEffect(() => {
    setTitle(entry.title)
    setContent(entry.transcription || '')
  }, [entry.title, entry.transcription])

  // Check for unsaved changes
  useEffect(() => {
    const titleChanged = title !== entry.title
    const contentChanged = content !== (entry.transcription || '')
    setHasUnsavedChanges(titleChanged || contentChanged)
  }, [title, content, entry.title, entry.transcription])

  // Auto-resize textarea
  const autoResizeTextarea = useCallback(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.max(textareaRef.current.scrollHeight, 200)}px`
    }
  }, [])

  useEffect(() => {
    autoResizeTextarea()
  }, [content, autoResizeTextarea])

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
    return text
      .replace(/^## (.*$)/gm, '<h2 class="text-xl font-bold mb-2 text-white">$1</h2>')
      .replace(/^# (.*$)/gm, '<h1 class="text-2xl font-bold mb-3 text-white">$1</h1>')
      .replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold">$1</strong>')
      .replace(/\*(.*?)\*/g, '<em class="italic">$1</em>')
      .replace(/`(.*?)`/g, '<code class="bg-white/20 px-1 rounded text-sm">$1</code>')
      .replace(/^> (.*$)/gm, '<blockquote class="border-l-4 border-white/30 pl-4 italic text-white/80">$1</blockquote>')
      .replace(/^- (.*$)/gm, '<li class="ml-4 text-white/90">• $1</li>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-blue-400 hover:underline" target="_blank">$1</a>')
      .replace(/\n/g, '<br>')
  }

  // Embedded mode for side-by-side view
  if (embedded) {
    return (
      <div className={`${className} space-y-4`}>
        {/* Edit/Preview Toggle */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setViewMode('edit')}
              className={`px-3 py-1 text-sm rounded transition-colors ${
                viewMode === 'edit' 
                  ? 'bg-green-500 text-white' 
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              Edit
            </button>
            <button
              onClick={() => setViewMode('preview')}
              className={`px-3 py-1 text-sm rounded transition-colors ${
                viewMode === 'preview' 
                  ? 'bg-green-500 text-white' 
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              Preview
            </button>
          </div>
          {hasUnsavedChanges && (
            <span className="text-xs text-orange-400 bg-orange-500/20 px-2 py-1 rounded">
              Unsaved
            </span>
          )}
        </div>

        {viewMode === 'edit' && (
          <>
            {/* Markdown Toolbar */}
            <div className="flex items-center space-x-1 bg-white/5 rounded-t-lg px-2 py-1.5">
              <button
                onClick={() => insertMarkdown('bold', 'bold')}
                className="p-1.5 hover:bg-white/20 rounded text-white/70 hover:text-white"
                title="Bold (Ctrl+B)"
              >
                <strong className="text-sm">B</strong>
              </button>
              <button
                onClick={() => insertMarkdown('italic', 'italic')}
                className="p-1.5 hover:bg-white/20 rounded text-white/70 hover:text-white"
                title="Italic (Ctrl+I)"
              >
                <em className="text-sm">I</em>
              </button>
              <button
                onClick={() => insertMarkdown('heading', 'Heading')}
                className="p-1.5 hover:bg-white/20 rounded text-white/70 hover:text-white"
                title="Heading"
              >
                <span className="text-sm font-bold">H</span>
              </button>
              <button
                onClick={() => insertMarkdown('list', 'Item')}
                className="p-1.5 hover:bg-white/20 rounded text-white/70 hover:text-white"
                title="List"
              >
                <span className="text-sm">•</span>
              </button>
              <button
                onClick={() => insertMarkdown('quote', 'Quote')}
                className="p-1.5 hover:bg-white/20 rounded text-white/70 hover:text-white"
                title="Quote"
              >
                <span className="text-sm">"</span>
              </button>
              <button
                onClick={() => insertMarkdown('code', 'code')}
                className="p-1.5 hover:bg-white/20 rounded text-white/70 hover:text-white font-mono"
                title="Code"
              >
                <span className="text-xs">&lt;/&gt;</span>
              </button>
            </div>

            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full px-3 py-3 bg-white/5 border border-white/20 border-t-0 rounded-b-lg text-white placeholder-white/40 focus:ring-2 focus:ring-green-400 focus:border-transparent resize-none min-h-[200px]"
              placeholder="Transcription text with markdown support..."
            />
          </>
        )}

        {viewMode === 'preview' && (
          <div className="bg-white/5 border border-white/20 rounded-lg p-4 min-h-[200px]">
            <div 
              className="prose prose-invert prose-sm max-w-none text-white/90"
              dangerouslySetInnerHTML={{ __html: renderMarkdownPreview(content || 'No content yet...') }}
            />
          </div>
        )}

        {/* Save Button */}
        {hasUnsavedChanges && (
          <button
            onClick={handleSave}
            className="w-full py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition-colors"
          >
            Save Transcription
          </button>
        )}
      </div>
    )
  }

  // Full mode (standalone editor)
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
            Transcription
          </label>
          <div className="text-xs text-white/70">
            Supports Markdown (Ctrl+B bold, Ctrl+I italic, Ctrl+S save)
          </div>
        </div>

        {viewMode === 'edit' && (
          <>
            {/* Markdown Toolbar */}
            <div className="border border-white/20 rounded-t-lg bg-white/10 px-3 py-2 flex items-center space-x-2">
              <button
                onClick={() => insertMarkdown('bold', 'bold text')}
                className="p-1.5 hover:bg-white/20 rounded text-white/70 hover:text-white"
                title="Bold (Ctrl+B)"
              >
                <strong className="text-sm">B</strong>
              </button>
              <button
                onClick={() => insertMarkdown('italic', 'italic text')}
                className="p-1.5 hover:bg-white/20 rounded text-white/70 hover:text-white"
                title="Italic (Ctrl+I)"
              >
                <em className="text-sm">I</em>
              </button>
              <span className="w-px h-4 bg-white/20"></span>
              <button
                onClick={() => insertMarkdown('heading', 'Heading')}
                className="p-1.5 hover:bg-white/20 rounded text-white/70 hover:text-white"
                title="Heading"
              >
                <span className="text-sm font-bold">H2</span>
              </button>
              <button
                onClick={() => insertMarkdown('list', 'List item')}
                className="p-1.5 hover:bg-white/20 rounded text-white/70 hover:text-white"
                title="List"
              >
                <span className="text-sm">• List</span>
              </button>
              <button
                onClick={() => insertMarkdown('quote', 'Quote')}
                className="p-1.5 hover:bg-white/20 rounded text-white/70 hover:text-white"
                title="Quote"
              >
                <span className="text-sm">&quot; Quote</span>
              </button>
              <button
                onClick={() => insertMarkdown('code', 'code')}
                className="p-1.5 hover:bg-white/20 rounded text-white/70 hover:text-white font-mono"
                title="Code"
              >
                <span className="text-sm">&lt;code&gt;</span>
              </button>
              <button
                onClick={() => insertMarkdown('link', 'link text')}
                className="p-1.5 hover:bg-white/20 rounded text-white/70 hover:text-white"
                title="Link"
              >
                <span className="text-sm">🔗 Link</span>
              </button>
            </div>

            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full px-3 py-3 bg-white/5 border border-white/20 border-t-0 rounded-b-lg text-white placeholder-white/40 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none min-h-[300px]"
              placeholder="Start typing your journal entry... Use Markdown formatting for rich text."
            />
          </>
        )}

        {viewMode === 'preview' && (
          <div className="border border-white/20 rounded-lg p-4 min-h-[300px] bg-white/5">
            <div 
              className="prose prose-invert prose-sm max-w-none text-white/90"
              dangerouslySetInnerHTML={{ __html: renderMarkdownPreview(content || 'Nothing to preview...') }}
            />
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-between pt-4 border-t border-white/10">
        <div className="flex items-center space-x-3">
          <button
            onClick={onCancel}
            className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            Back to List
          </button>
          
          <button
            onClick={onDelete}
            className="bg-red-500/20 hover:bg-red-500/30 text-red-300 px-4 py-2 rounded-lg font-medium transition-colors"
          >
            Delete Entry
          </button>
        </div>
        
        <button
          onClick={handleSave}
          disabled={!hasUnsavedChanges}
          className={`px-6 py-2 rounded-lg font-medium transition-colors ${
            hasUnsavedChanges
              ? 'bg-blue-500 hover:bg-blue-600 text-white'
              : 'bg-white/10 text-white/50 cursor-not-allowed'
          }`}
        >
          Save Changes
        </button>
      </div>
    </div>
  )
}

export default TranscriptEditor
