'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import {
  buildJournalAudioStoragePath,
  isAllowedJournalAudioMimeType,
} from '@/lib/journal-audio-storage'
import AudioRecorder from './AudioRecorder'
import TranscriptEditor from './TranscriptEditor'

interface JournalEntry {
  id: string
  user_id: string
  title: string
  audio_file_path?: string
  audio_duration?: number
  audio_file_size?: number
  transcription?: string
  transcription_status: 'pending' | 'processing' | 'completed' | 'failed'
  transcription_provider?: string
  use_audio_for_insights: boolean
  use_transcript_for_insights: boolean
  created_at: string
  updated_at: string
}

interface JournalViewProps {
  userId?: string
  className?: string
}

type ViewMode = 'list' | 'record' | 'view'

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
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [audioUrls, setAudioUrls] = useState<Record<string, string>>({})
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(10) // Show 10 entries per page
  
  // Ref to store handleTranscribe so it can be called from handleRecordingComplete
  const handleTranscribeRef = useRef<((entryId: string) => Promise<void>) | null>(null)

  // Load journal entries from API
  const loadEntries = useCallback(async () => {
    if (!userId) return

    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/journal?user_id=${userId}`)
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to load entries')
      }

      setEntries(result.data || [])
    } catch (err: any) {
      console.error('Error loading journal entries:', err)
      setError('Failed to load journal entries')
    } finally {
      setLoading(false)
    }
  }, [userId])

  // Handle new recording complete
  const handleRecordingComplete = useCallback(async (audioBlob: Blob, duration: number) => {
    if (!userId) {
      console.error('❌ No userId available')
      setError('User not authenticated')
      return
    }

    // CRITICAL: Clone the blob immediately to preserve it before any async operations
    // This prevents the blob from being consumed or garbage collected
    let preservedBlob: Blob
    try {
      // Clone the blob to ensure it's not consumed
      preservedBlob = audioBlob.slice(0, audioBlob.size, audioBlob.type || 'audio/webm')
      console.log('💾 Blob cloned for preservation, original size:', audioBlob.size, 'cloned size:', preservedBlob.size, 'type:', preservedBlob.type)
    } catch (cloneError) {
      console.error('❌ Failed to clone blob, using original:', cloneError)
      preservedBlob = audioBlob
    }

    try {
      setError(null)
      console.log('💾 Starting to save recording, duration:', duration, 'blob size:', preservedBlob.size)
      
      // Validate blob before proceeding
      if (!preservedBlob || preservedBlob.size === 0) {
        console.error('❌ Invalid audio blob:', { 
          hasBlob: !!preservedBlob, 
          size: preservedBlob?.size,
          type: preservedBlob?.type 
        })
        throw new Error('No audio data to upload. Please record audio before saving.')
      }
      
      // First create the journal entry
      const createResponse = await fetch('/api/journal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          title: `Journal Entry - ${new Date().toLocaleDateString()}`,
          audio_duration: Math.round(duration),
          transcription_status: 'pending',
          use_audio_for_insights: true,
          use_transcript_for_insights: true
        })
      })

      console.log('📡 Create entry response status:', createResponse.status, 'ok:', createResponse.ok)
      
      if (!createResponse.ok) {
        const errorText = await createResponse.text()
        console.error('❌ Create entry failed:', errorText)
        let errorData
        try {
          errorData = JSON.parse(errorText)
        } catch {
          errorData = { error: errorText || 'Failed to create entry' }
        }
        throw new Error(errorData.error || 'Failed to create entry')
      }

      const createResult = await createResponse.json()
      console.log('✅ Create entry response:', createResult)
      
      if (!createResult) {
        throw new Error('Empty response from server')
      }

      // Handle different response structures
      const newEntry = createResult.data || createResult.entry || createResult
      
      if (!newEntry || !newEntry.id) {
        console.error('❌ Invalid entry structure:', createResult)
        throw new Error('Invalid entry data received from server')
      }
      
      console.log('✅ Entry created:', newEntry.id)

      // Re-validate blob after async operation (it should still be valid, but check anyway)
      if (!preservedBlob || preservedBlob.size === 0) {
        console.error('❌ Blob became invalid after entry creation:', { 
          hasBlob: !!preservedBlob, 
          size: preservedBlob?.size,
          type: preservedBlob?.type 
        })
        throw new Error('Audio data was lost. Please try recording again.')
      }

      const blobType = preservedBlob.type || 'audio/webm'
      console.log('📤 Uploading audio, blob size:', preservedBlob.size, 'type:', blobType)

      let audioUploadSuccess = false

      if (!isAllowedJournalAudioMimeType(blobType)) {
        setError(
          `Entry created but audio upload was skipped: unsupported format (${blobType || 'unknown'}).`
        )
      } else {
        const { data: sessionData } = await supabase.auth.getSession()
        const hasClientSession = !!sessionData?.session

        if (hasClientSession) {
          // Direct-to-Supabase upload avoids Vercel's ~4.5MB serverless body limit (413 FUNCTION_PAYLOAD_TOO_LARGE).
          const storagePath = buildJournalAudioStoragePath(userId, newEntry.id, blobType)
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('journal_audio')
            .upload(storagePath, preservedBlob, {
              contentType: blobType,
              upsert: true,
            })

          if (uploadError) {
            console.error('❌ Supabase storage upload failed:', uploadError)
            setError(
              'Entry created but audio upload failed. ' +
                (uploadError.message || 'Storage upload failed')
            )
          } else {
            const audioPath = uploadData?.path ?? storagePath
            const patchResponse = await fetch(`/api/journal/${newEntry.id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                user_id: userId,
                audio_file_path: audioPath,
                audio_duration: Math.round(duration),
                audio_file_size: preservedBlob.size,
              }),
            })
            const patchBody = await patchResponse.json().catch(() => ({}))
            if (!patchResponse.ok || !patchBody.success) {
              const msg =
                patchBody.error || patchBody.details || 'Failed to attach audio to journal entry'
              console.error('❌ Journal metadata update after upload failed:', msg)
              setError('Audio uploaded but saving entry failed. ' + msg)
            } else {
              newEntry.audio_file_path = audioPath
              newEntry.audio_duration = Math.round(duration)
              newEntry.audio_file_size = preservedBlob.size
              const { data: signed } = await supabase.storage
                .from('journal_audio')
                .createSignedUrl(audioPath, 3600)
              const fallbackPublic = supabase.storage.from('journal_audio').getPublicUrl(audioPath)
              const playbackUrl = signed?.signedUrl || fallbackPublic?.data?.publicUrl
              if (playbackUrl) {
                setAudioUrls((prev) => ({ ...prev, [newEntry.id]: playbackUrl }))
              }
              audioUploadSuccess = true
              console.log('✅ Audio uploaded via Supabase Storage:', audioPath)
            }
          }
        } else {
          // Tests and rare no-session cases: multipart via API (keep under Vercel body limit in production).
          let fileName = 'journal.webm'
          if (blobType.includes('mp4') || blobType.includes('m4a')) {
            fileName = 'journal.m4a'
          } else if (blobType.includes('mp3') || blobType.includes('mpeg')) {
            fileName = 'journal.mp3'
          } else if (blobType.includes('ogg')) {
            fileName = 'journal.ogg'
          } else if (blobType.includes('wav')) {
            fileName = 'journal.wav'
          }

          let audioFile: File
          try {
            audioFile = new File([preservedBlob], fileName, { type: blobType })
          } catch (fileError) {
            console.error('❌ Failed to create File object:', fileError)
            throw new Error('Failed to prepare audio file for upload')
          }

          const formData = new FormData()
          formData.append('audio', audioFile)
          formData.append('user_id', userId)
          formData.append('entry_id', newEntry.id)
          formData.append('duration', Math.round(duration).toString())

          const audioResponse = await fetch('/api/journal/audio', {
            method: 'POST',
            body: formData,
          })

          console.log('📡 Audio upload response status:', audioResponse.status, 'ok:', audioResponse.ok)

          if (!audioResponse.ok) {
            const errorText = await audioResponse.text()
            console.error('❌ Audio upload failed:', errorText)
            let errorData: { error?: string; details?: string }
            try {
              errorData = JSON.parse(errorText)
            } catch {
              errorData = { error: errorText || 'Audio upload failed' }
            }
            const hint =
              preservedBlob.size > 4_500_000
                ? ' Long recordings must use a signed-in browser session so audio uploads directly to storage.'
                : ''
            setError(
              'Entry created but audio upload failed. ' +
                (errorData.error || errorData.details || '') +
                hint
            )
          } else {
            const audioResult = await audioResponse.json()
            console.log('✅ Audio uploaded:', audioResult)
            newEntry.audio_file_path =
              audioResult.audio_file_path || audioResult.data?.audio_file_path
            if (audioResult.audio_url || audioResult.data?.audio_url) {
              setAudioUrls((prev) => ({
                ...prev,
                [newEntry.id]:
                  audioResult.audio_url || audioResult.data?.audio_url,
              }))
            }
            audioUploadSuccess = true
          }
        }
      }

      // Validate audio file size - reject files that are too small (likely silence)
      if (preservedBlob.size < 2000) {
        console.warn(
          '⚠️ Audio file is very small (' + preservedBlob.size + ' bytes) - likely silence'
        )
        setError(
          'Audio file is too small. The microphone may not be capturing audio. Please check your microphone settings and try again.'
        )
        newEntry.transcription_status = 'failed'
      }

      // Add to entries list
      setEntries((prev) => [newEntry, ...prev])
      console.log('✅ Entry added to list')

      // Show the new entry
      setSelectedEntry(newEntry)
      setViewMode('view')
      console.log('✅ Recording saved successfully')

      // Automatically trigger transcription if audio was uploaded successfully
      if (
        audioUploadSuccess &&
        preservedBlob.size >= 2000 &&
        newEntry.audio_file_path
      ) {
        console.log(
          '🎙️ Auto-triggering transcription for entry:',
          newEntry.id,
          'file size:',
          preservedBlob.size
        )
        setTimeout(() => {
          if (handleTranscribeRef.current) {
            handleTranscribeRef.current(newEntry.id)
          }
        }, 500)
      } else if (preservedBlob.size < 2000) {
        console.warn(
          '⚠️ Skipping auto-transcription - audio file too small:',
          preservedBlob.size
        )
      }
    } catch (err: any) {
      console.error('❌ Error saving recording:', err)
      setError(err.message || 'Failed to save recording')
      // Don't change view mode on error - let user try again
    }
  }, [userId])

  // Trigger transcription
  const handleTranscribe = useCallback(async (entryId: string) => {
    if (!userId) return

    try {
      setIsTranscribing(true)
      setError(null)

      const response = await fetch('/api/journal/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entry_id: entryId,
          user_id: userId,
          provider: 'openai_whisper'
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Transcription failed')
      }

      // Update entry with transcription
      setEntries(prev => prev.map(e => 
        e.id === entryId 
          ? { ...e, transcription: result.transcription, transcription_status: 'completed' }
          : e
      ))

      if (selectedEntry?.id === entryId) {
        setSelectedEntry(prev => prev ? { 
          ...prev, 
          transcription: result.transcription,
          transcription_status: 'completed'
        } : null)
      }

    } catch (err: any) {
      console.error('Transcription error:', err)
      setError(err.message || 'Transcription failed')
      
      // Mark as failed
      setEntries(prev => prev.map(e => 
        e.id === entryId ? { ...e, transcription_status: 'failed' } : e
      ))
    } finally {
      setIsTranscribing(false)
    }
  }, [userId, selectedEntry])
  
  // Store handleTranscribe in ref so it can be called from handleRecordingComplete
  useEffect(() => {
    handleTranscribeRef.current = handleTranscribe
  }, [handleTranscribe])

  // Update entry
  const handleEntryUpdate = useCallback(async (
    entryId: string, 
    updates: Partial<JournalEntry>
  ) => {
    if (!userId) return

    try {
      console.log('📝 Updating journal entry:', entryId, 'Updates:', Object.keys(updates))
      
      const response = await fetch(`/api/journal/${entryId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          ...updates
        })
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        const errorMessage = result.error || result.details || 'Failed to update'
        console.error('❌ Update failed:', errorMessage)
        throw new Error(errorMessage)
      }

      console.log('✅ Entry updated successfully')
      
      // Update entries list
      setEntries(prev => prev.map(e => e.id === entryId ? { ...e, ...updates, updated_at: result.data?.updated_at || e.updated_at } : e))
      
      // Update selected entry if it's the one being edited
      if (selectedEntry?.id === entryId) {
        setSelectedEntry(prev => prev ? { ...prev, ...updates, updated_at: result.data?.updated_at || prev.updated_at } : null)
      }

    } catch (err: any) {
      console.error('❌ Update error:', err)
      setError(err.message || 'Failed to update entry')
    }
  }, [userId, selectedEntry])

  // Delete entry
  const handleEntryDelete = useCallback(async (entryId: string) => {
    if (!userId) return
    
    const confirmed = window.confirm('Are you sure you want to delete this journal entry? This will also delete the associated audio file and cannot be undone.')
    if (!confirmed) return

    try {
      console.log('🗑️ Deleting journal entry:', entryId)
      
      const response = await fetch(`/api/journal/${entryId}?user_id=${userId}`, {
        method: 'DELETE'
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        const errorMessage = result.error || result.details || 'Failed to delete'
        console.error('❌ Delete failed:', errorMessage)
        throw new Error(errorMessage)
      }

      console.log('✅ Entry deleted successfully')
      
      // Remove from entries list
      setEntries(prev => prev.filter(e => e.id !== entryId))
      
      // Clear selected entry if it was the deleted one
      if (selectedEntry?.id === entryId) {
        setSelectedEntry(null)
        setViewMode('list')
      }
      
      setError(null) // Clear any previous errors

    } catch (err: any) {
      console.error('❌ Delete error:', err)
      setError(err.message || 'Failed to delete entry')
    }
  }, [userId, selectedEntry])

  // Handle entry selection
  const handleEntrySelect = (entry: JournalEntry) => {
    setSelectedEntry(entry)
    setViewMode('view')
  }

  // Format duration
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Filter entries
  const filteredEntries = entries.filter(entry =>
    entry.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    entry.transcription?.toLowerCase().includes(searchQuery.toLowerCase())
  )
  
  // Pagination calculations
  const totalPages = Math.ceil(filteredEntries.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedEntries = filteredEntries.slice(startIndex, endIndex)
  
  // Reset to page 1 when search query changes
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery])
  
  // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    // Scroll to top of entries list
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

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
            <svg className="w-5 h-5 text-red-400 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-red-300 flex-1">{error}</span>
            <button onClick={() => setError(null)} className="ml-3 text-red-400 hover:text-red-300">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* View Mode Tabs */}
      <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 shadow-2xl overflow-hidden">
        <div className="border-b border-white/20">
          <nav className="flex space-x-8 px-6" aria-label="Tabs">
            <button
              onClick={() => { setViewMode('list'); setSelectedEntry(null); }}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                viewMode === 'list'
                  ? 'border-blue-400 text-blue-300'
                  : 'border-transparent text-white/70 hover:text-white'
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
                  : 'border-transparent text-white/70 hover:text-white'
              }`}
            >
              <div className="flex items-center">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
                Record New Entry
              </div>
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {/* List View */}
          {viewMode === 'list' && (
            <div className="space-y-6">
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
                <>
                  <div className="space-y-4">
                    {paginatedEntries.map(entry => (
                    <div
                      key={entry.id}
                      className="border border-white/20 bg-white/5 rounded-lg p-4 hover:bg-white/10 transition-all cursor-pointer"
                      onClick={() => handleEntrySelect(entry)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-white mb-1 truncate">{entry.title}</h3>
                          {entry.transcription && (
                            <p className="text-sm text-white/70 mb-2 line-clamp-2">{entry.transcription}</p>
                          )}
                          <div className="flex items-center flex-wrap gap-3 text-xs text-white/50">
                            <span>{new Date(entry.created_at).toLocaleDateString()}</span>
                            {entry.audio_duration && (
                              <span className="flex items-center">
                                <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728" />
                                </svg>
                                {formatDuration(entry.audio_duration)}
                              </span>
                            )}
                            <span className={`px-2 py-0.5 rounded ${
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
                          onClick={(e) => { e.stopPropagation(); handleEntryDelete(entry.id); }}
                          className="text-white/40 hover:text-red-400 p-1 ml-2"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                    ))}
                  </div>
                  
                  {/* Pagination Controls */}
                  {totalPages > 1 && (
                    <div className="mt-6 pt-6 border-t border-white/20">
                      <div className="flex items-center justify-between flex-wrap gap-4">
                        <div className="text-sm text-white/70">
                          Showing {startIndex + 1}-{Math.min(endIndex, filteredEntries.length)} of {filteredEntries.length} entries
                        </div>
                        
                        <div className="flex items-center gap-2">
                          {/* Previous Button */}
                          <button
                            onClick={() => handlePageChange(currentPage - 1)}
                            disabled={currentPage === 1}
                            className={`px-4 py-2 bg-white/10 hover:bg-white/20 text-white font-medium rounded-lg transition-colors border border-white/20 ${
                              currentPage === 1 ? 'opacity-50 cursor-not-allowed' : ''
                            }`}
                          >
                            Previous
                          </button>
                          
                          {/* Page Numbers */}
                          <div className="flex items-center gap-1">
                            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                              let pageNum: number
                              if (totalPages <= 5) {
                                pageNum = i + 1
                              } else if (currentPage <= 3) {
                                pageNum = i + 1
                              } else if (currentPage >= totalPages - 2) {
                                pageNum = totalPages - 4 + i
                              } else {
                                pageNum = currentPage - 2 + i
                              }
                              
                              return (
                                <button
                                  key={pageNum}
                                  onClick={() => handlePageChange(pageNum)}
                                  className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors border ${
                                    currentPage === pageNum
                                      ? 'bg-blue-500 text-white border-blue-500'
                                      : 'bg-white/10 hover:bg-white/20 text-white border-white/20'
                                  }`}
                                >
                                  {pageNum}
                                </button>
                              )
                            })}
                          </div>
                          
                          {/* Next Button */}
                          <button
                            onClick={() => handlePageChange(currentPage + 1)}
                            disabled={currentPage === totalPages}
                            className={`px-4 py-2 bg-white/10 hover:bg-white/20 text-white font-medium rounded-lg transition-colors border border-white/20 ${
                              currentPage === totalPages ? 'opacity-50 cursor-not-allowed' : ''
                            }`}
                          >
                            Next
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Record View */}
          {viewMode === 'record' && (
            <AudioRecorder
              onRecordingComplete={handleRecordingComplete}
              onCancel={() => setViewMode('list')}
              maxDuration={1800}
            />
          )}

          {/* Entry Detail View - Side by Side */}
          {viewMode === 'view' && selectedEntry && (
            <div className="space-y-6">
              {/* Header with title edit */}
              <div className="flex items-center justify-between">
                <input
                  type="text"
                  value={selectedEntry.title}
                  onChange={(e) => handleEntryUpdate(selectedEntry.id, { title: e.target.value })}
                  className="text-xl font-semibold text-white bg-transparent border-b border-transparent hover:border-white/30 focus:border-blue-400 focus:outline-none px-1 py-1 flex-1"
                />
                <button
                  onClick={() => { setSelectedEntry(null); setViewMode('list'); }}
                  className="text-white/60 hover:text-white ml-4"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Side by Side: Audio & Transcript */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Audio Panel */}
                <div className="bg-white/5 rounded-xl border border-white/20 p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium text-white flex items-center">
                      <svg className="w-5 h-5 mr-2 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                      </svg>
                      Audio Recording
                    </h3>
                    {/* AI Insight Checkbox */}
                    <label className="flex items-center text-sm text-white/70 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedEntry.use_audio_for_insights}
                        onChange={(e) => handleEntryUpdate(selectedEntry.id, { use_audio_for_insights: e.target.checked })}
                        className="w-4 h-4 mr-2 rounded border-white/30 bg-white/10 text-blue-500 focus:ring-blue-500"
                      />
                      Use for AI Insights
                    </label>
                  </div>

                  {selectedEntry.audio_file_path ? (
                    <div className="space-y-4">
                      <div className="bg-white/5 rounded-lg p-4">
                        <audio
                          controls
                          className="w-full"
                          src={audioUrls[selectedEntry.id]}
                        >
                          Your browser does not support the audio element.
                        </audio>
                      </div>
                      <div className="flex items-center justify-between text-sm text-white/60">
                        <span>Duration: {selectedEntry.audio_duration ? formatDuration(selectedEntry.audio_duration) : 'Unknown'}</span>
                        <span>Size: {selectedEntry.audio_file_size ? `${Math.round(selectedEntry.audio_file_size / 1024)} KB` : 'Unknown'}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-white/50">
                      <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                      </svg>
                      <p>No audio recording</p>
                    </div>
                  )}
                </div>

                {/* Transcript Panel */}
                <div className="bg-white/5 rounded-xl border border-white/20 p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium text-white flex items-center">
                      <svg className="w-5 h-5 mr-2 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Transcription
                    </h3>
                    {/* AI Insight Checkbox */}
                    <label className="flex items-center text-sm text-white/70 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedEntry.use_transcript_for_insights}
                        onChange={(e) => handleEntryUpdate(selectedEntry.id, { use_transcript_for_insights: e.target.checked })}
                        className="w-4 h-4 mr-2 rounded border-white/30 bg-white/10 text-green-500 focus:ring-green-500"
                      />
                      Use for AI Insights
                    </label>
                  </div>

                  {/* Transcription Status & Actions */}
                  {selectedEntry.transcription_status !== 'completed' && (
                    <div className="mb-4">
                      {selectedEntry.transcription_status === 'pending' && selectedEntry.audio_file_path && (
                        <button
                          onClick={() => handleTranscribe(selectedEntry.id)}
                          disabled={isTranscribing}
                          className="w-full py-2 px-4 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-500/50 text-white rounded-lg font-medium transition-colors flex items-center justify-center"
                        >
                          {isTranscribing ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                              Transcribing...
                            </>
                          ) : (
                            <>
                              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                              Start Transcription
                            </>
                          )}
                        </button>
                      )}
                      {selectedEntry.transcription_status === 'processing' && (
                        <div className="text-center py-4 text-yellow-300">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-300 mx-auto mb-2"></div>
                          Transcription in progress...
                        </div>
                      )}
                      {selectedEntry.transcription_status === 'failed' && (
                        <div className="text-center py-4">
                          <p className="text-red-300 mb-2">Transcription failed</p>
                          <button
                            onClick={() => handleTranscribe(selectedEntry.id)}
                            disabled={isTranscribing}
                            className="py-2 px-4 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-lg font-medium transition-colors"
                          >
                            Retry
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Transcript Editor */}
                  {selectedEntry.transcription ? (
                    <TranscriptEditor
                      entry={selectedEntry}
                      onSave={(title, content) => handleEntryUpdate(selectedEntry.id, { title, transcription: content })}
                      onCancel={() => {}}
                      onDelete={() => handleEntryDelete(selectedEntry.id)}
                      embedded={true}
                    />
                  ) : (
                    <div className="text-center py-8 text-white/50">
                      <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <p>No transcription yet</p>
                      {!selectedEntry.audio_file_path && <p className="text-xs mt-1">Record audio first to enable transcription</p>}
                    </div>
                  )}
                </div>
              </div>

              {/* Metadata Footer */}
              <div className="flex items-center justify-between text-sm text-white/50 pt-4 border-t border-white/10">
                <span>Created: {new Date(selectedEntry.created_at).toLocaleString()}</span>
                <span>Updated: {new Date(selectedEntry.updated_at).toLocaleString()}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default JournalView
