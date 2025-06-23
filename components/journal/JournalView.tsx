'use client'

import React, { useState, useEffect, useCallback } from 'react'
import AudioRecorder from './AudioRecorder'
import TranscriptEditor from './TranscriptEditor'
import { supabase } from '@/lib/supabase.js'

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

interface JournalViewProps {
  userId?: string
  className?: string
}

type ViewMode = 'list' | 'record' | 'edit'

const JournalView: React.FC<JournalViewProps> = ({
  userId,
  className = ''
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [entries, setEntries] = useState<JournalEntry[]>([])
  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  // Load journal entries
  const loadEntries = useCallback(async () => {
    if (!userId) return

    try {
      setLoading(true)
      setError(null)

      const { data, error: fetchError } = await supabase
        .from('journal_entries')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (fetchError) {
        throw fetchError
      }

      setEntries(data || [])
    } catch (err) {
      console.error('Error loading journal entries:', err)
      setError('Failed to load journal entries')
    } finally {
      setLoading(false)
    }
  }, [userId])

  // Handle new recording
  const handleRecordingComplete = useCallback(async (audioBlob: Blob, duration: number) => {
    if (!userId) return

    try {
      // Create a new journal entry
      const now = new Date().toISOString()
      const fileName = `journal_${Date.now()}.webm`
      
      // Upload audio file (placeholder - would need actual file upload implementation)
      const audioFilePath = `journal_audio/${userId}/${fileName}`
      
      const { data, error } = await supabase
        .from('journal_entries')
        .insert({
          user_id: userId,
          title: `Journal Entry ${new Date().toLocaleDateString()}`,
          content: '(Transcription pending...)',
          audio_file_path: audioFilePath,
          audio_duration: Math.round(duration),
          transcription_status: 'pending',
          created_at: now,
          updated_at: now
        })
        .select()
        .single()

      if (error) {
        throw error
      }

      // Add to entries list
      setEntries(prev => [data, ...prev])
      
      // Switch to edit mode for the new entry
      setSelectedEntry(data)
      setViewMode('edit')
      
    } catch (err) {
      console.error('Error saving recording:', err)
      setError('Failed to save recording')
    }
  }, [userId])

  // Handle entry selection
  const handleEntrySelect = (entry: JournalEntry) => {
    setSelectedEntry(entry)
    setViewMode('edit')
  }

  // Handle entry update
  const handleEntryUpdate = useCallback(async (entryId: string, title: string, content: string) => {
    try {
      const { error } = await supabase
        .from('journal_entries')
        .update({
          title,
          content,
          updated_at: new Date().toISOString()
        })
        .eq('id', entryId)

      if (error) {
        throw error
      }

      // Update local state
      setEntries(prev => 
        prev.map(entry => 
          entry.id === entryId 
            ? { ...entry, title, content, updated_at: new Date().toISOString() }
            : entry
        )
      )

      if (selectedEntry?.id === entryId) {
        setSelectedEntry(prev => prev ? { ...prev, title, content } : null)
      }

    } catch (err) {
      console.error('Error updating entry:', err)
      setError('Failed to update entry')
    }
  }, [selectedEntry])

  // Handle entry deletion
  const handleEntryDelete = useCallback(async (entryId: string) => {
    if (!window.confirm('Are you sure you want to delete this journal entry?')) {
      return
    }

    try {
      const { error } = await supabase
        .from('journal_entries')
        .delete()
        .eq('id', entryId)

      if (error) {
        throw error
      }

      // Update local state
      setEntries(prev => prev.filter(entry => entry.id !== entryId))
      
      if (selectedEntry?.id === entryId) {
        setSelectedEntry(null)
        setViewMode('list')
      }

    } catch (err) {
      console.error('Error deleting entry:', err)
      setError('Failed to delete entry')
    }
  }, [selectedEntry])

  // Filter entries based on search
  const filteredEntries = entries.filter(entry =>
    entry.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    entry.content.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Effects
  useEffect(() => {
    loadEntries()
  }, [loadEntries])

  if (loading) {
    return (
      <div className={`${className} py-12`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-white/70">Loading journal entries...</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`${className} space-y-6`}>
      {/* Error Message */}
      {error && (
        <div className="bg-red-500/20 border border-red-400/30 rounded-lg p-4">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-red-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-red-300">{error}</span>
            <button
              onClick={() => setError(null)}
              className="ml-auto text-red-400 hover:text-red-300"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* View Mode Tabs */}
      <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 shadow-2xl">
        <div className="border-b border-white/20">
          <nav className="flex space-x-8 px-6" aria-label="Tabs">
            <button
              onClick={() => setViewMode('list')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                viewMode === 'list'
                  ? 'border-blue-400 text-blue-300'
                  : 'border-transparent text-white/70 hover:text-white hover:border-white/30'
              }`}
            >
              <div className="flex items-center">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Journal Entries ({entries.length})
              </div>
            </button>
            
            <button
              onClick={() => setViewMode('record')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                viewMode === 'record'
                  ? 'border-blue-400 text-blue-300'
                  : 'border-transparent text-white/70 hover:text-white hover:border-white/30'
              }`}
            >
              <div className="flex items-center">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
                Record New Entry
              </div>
            </button>
            
            {selectedEntry && (
              <button
                onClick={() => setViewMode('edit')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  viewMode === 'edit'
                    ? 'border-blue-400 text-blue-300'
                    : 'border-transparent text-white/70 hover:text-white hover:border-white/30'
                }`}
              >
                <div className="flex items-center">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Edit Entry
                </div>
              </button>
            )}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {viewMode === 'list' && (
            <div className="space-y-6">
              {/* Search */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search journal entries..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                />
                <svg className="absolute left-3 top-2.5 w-5 h-5 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>

              {/* Entries List */}
              {filteredEntries.length === 0 ? (
                <div className="text-center py-12">
                  <svg className="w-12 h-12 text-white/40 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  </svg>
                  <h3 className="text-lg font-medium text-white mb-2">No journal entries yet</h3>
                  <p className="text-white/70 mb-4">Start recording your thoughts and ideas to create your first journal entry.</p>
                  <button
                    onClick={() => setViewMode('record')}
                    className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                  >
                    Record First Entry
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredEntries.map(entry => (
                    <div
                      key={entry.id}
                      className="border border-white/20 bg-white/5 rounded-lg p-4 hover:bg-white/10 transition-all cursor-pointer"
                      onClick={() => handleEntrySelect(entry)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-medium text-white mb-1">{entry.title}</h3>
                          <p className="text-sm text-white/70 mb-2 line-clamp-2">{entry.content}</p>
                          <div className="flex items-center space-x-4 text-xs text-white/50">
                            <span>{new Date(entry.created_at).toLocaleDateString()}</span>
                            {entry.audio_duration && (
                              <span className="flex items-center">
                                <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728" />
                                </svg>
                                {Math.floor(entry.audio_duration / 60)}:{(entry.audio_duration % 60).toString().padStart(2, '0')}
                              </span>
                            )}
                            <span className={`px-2 py-1 rounded text-xs ${
                              entry.transcription_status === 'completed' ? 'bg-green-500/20 text-green-300' :
                              entry.transcription_status === 'processing' ? 'bg-yellow-500/20 text-yellow-300' :
                              entry.transcription_status === 'failed' ? 'bg-red-500/20 text-red-300' :
                              'bg-white/10 text-white/70'
                            }`}>
                              {entry.transcription_status}
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleEntryDelete(entry.id)
                          }}
                          className="text-white/40 hover:text-red-400 p-1"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {viewMode === 'record' && (
            <AudioRecorder
              onRecordingComplete={handleRecordingComplete}
              onCancel={() => setViewMode('list')}
            />
          )}

          {viewMode === 'edit' && selectedEntry && (
            <TranscriptEditor
              entry={selectedEntry}
              onSave={(title, content) => handleEntryUpdate(selectedEntry.id, title, content)}
              onCancel={() => setViewMode('list')}
              onDelete={() => handleEntryDelete(selectedEntry.id)}
            />
          )}
        </div>
      </div>
    </div>
  )
}

export default JournalView 