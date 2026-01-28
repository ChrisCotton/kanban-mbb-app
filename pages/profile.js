import React, { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabase'
import Layout from '../components/layout/Layout'
import ProfilePictureUpload from '../components/profile/ProfilePictureUpload'
import ProfileSettings from '../components/profile/ProfileSettings'
import styles from '../styles/Profile.module.css'

const ProfilePage = () => {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState(null)
  const [categories, setCategories] = useState([])
  
  // List of API key fields for reference
  const apiKeyFields = [
    'nano_banana_api_key',
    'google_ai_api_key',
    'openai_api_key',
    'google_speech_api_key',
    'assemblyai_api_key',
    'deepgram_api_key',
    'anthropic_claude_api_key',
    'google_gemini_api_key'
  ]
  
  const [profile, setProfile] = useState({
    display_name: null,
    avatar_url: null,
    default_category_id: null,
    default_target_revenue: 1000,
    ai_image_provider: 'openai_dalle',
    ai_audio_journal_provider: 'openai_whisper',
    ai_journal_insight_provider: 'openai_gpt4',
    nano_banana_api_key: null,
    google_ai_api_key: null,
    openai_api_key: null,
    google_speech_api_key: null,
    assemblyai_api_key: null,
    deepgram_api_key: null,
    anthropic_claude_api_key: null,
    google_gemini_api_key: null
  })

  // Check auth on mount
  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.replace('/auth/login')
        return
      }
      setUser(session.user)
    }
    checkUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        router.replace('/auth/login')
      } else {
        setUser(session.user)
      }
    })

    return () => subscription.unsubscribe()
  }, [router])

  // Load profile and categories
  useEffect(() => {
    if (user) {
      loadProfile()
      loadCategories()
    }
  }, [user])

  const loadProfile = async () => {
    try {
      const response = await fetch(`/api/profile?user_id=${user.id}`)
      const result = await response.json()
      
      if (result.success && result.data) {
        setProfile({
          display_name: result.data.display_name || null,
          avatar_url: result.data.avatar_url || null,
          default_category_id: result.data.default_category_id || null,
          default_target_revenue: result.data.default_target_revenue || 1000,
          ai_image_provider: result.data.ai_image_provider || 'openai_dalle',
          ai_audio_journal_provider: result.data.ai_audio_journal_provider || 'openai_whisper',
          ai_journal_insight_provider: result.data.ai_journal_insight_provider || 'openai_gpt4',
          // Load all API keys
          nano_banana_api_key: result.data.nano_banana_api_key || null,
          google_ai_api_key: result.data.google_ai_api_key || null,
          openai_api_key: result.data.openai_api_key || null,
          google_speech_api_key: result.data.google_speech_api_key || null,
          assemblyai_api_key: result.data.assemblyai_api_key || null,
          deepgram_api_key: result.data.deepgram_api_key || null,
          anthropic_claude_api_key: result.data.anthropic_claude_api_key || null,
          google_gemini_api_key: result.data.google_gemini_api_key || null
        })
      }
    } catch (error) {
      console.error('Error loading profile:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadCategories = async () => {
    try {
      // Get the session token for authenticated API call
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      
      const response = await fetch(`/api/categories?user_id=${user.id}`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      })
      const result = await response.json()
      
      if (result.success && result.data) {
        setCategories(result.data)
      }
    } catch (error) {
      console.error('Error loading categories:', error)
    }
  }

  const saveProfile = useCallback(async (updates) => {
    if (!user) return

    setSaving(true)
    setSaveMessage(null)

    try {
      console.log('💾 Saving profile updates:', Object.keys(updates))
      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.id,
          ...updates
        })
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        console.error('❌ Profile save failed:', result)
        const errorMessage = result.error || result.details || 'Failed to save'
        throw new Error(errorMessage)
      }

      console.log('✅ Profile saved successfully:', result.message)
      
      // Show warning if API keys couldn't be saved due to missing columns
      if (result.warning) {
        console.warn('⚠️ Warning:', result.warning)
        setSaveMessage({
          type: 'warning',
          text: result.warning + (result.migrationHint ? ` ${result.migrationHint}` : '')
        })
        // Clear warning after 10 seconds
        setTimeout(() => setSaveMessage(null), 10000)
      }
      
      // Update local state with saved data
      // IMPORTANT: Preserve API keys in local state even if server doesn't return them (for security)
      setProfile(prev => {
        const updated = { ...prev, ...updates }
        // Preserve existing API keys if they weren't in the update (server might not return them)
        apiKeyFields.forEach(field => {
          if (!(field in updates) && prev[field]) {
            updated[field] = prev[field]
          }
        })
        return updated
      })
      
      // Reload profile to get latest data from server
      // Note: API keys might not be returned for security, so we preserve them above
      try {
        const reloadResponse = await fetch(`/api/profile?user_id=${user.id}`)
        const reloadResult = await reloadResponse.json()
        if (reloadResult.success && reloadResult.data) {
          setProfile(prev => ({
            display_name: reloadResult.data.display_name || null,
            avatar_url: reloadResult.data.avatar_url || null,
            default_category_id: reloadResult.data.default_category_id || null,
            default_target_revenue: reloadResult.data.default_target_revenue || 1000,
            ai_image_provider: reloadResult.data.ai_image_provider || 'openai_dalle',
            ai_audio_journal_provider: reloadResult.data.ai_audio_journal_provider || 'openai_whisper',
            ai_journal_insight_provider: reloadResult.data.ai_journal_insight_provider || 'openai_gpt4',
            // Preserve API keys from previous state if server doesn't return them
            nano_banana_api_key: reloadResult.data.nano_banana_api_key || prev.nano_banana_api_key || null,
            google_ai_api_key: reloadResult.data.google_ai_api_key || prev.google_ai_api_key || null,
            openai_api_key: reloadResult.data.openai_api_key || prev.openai_api_key || null,
            google_speech_api_key: reloadResult.data.google_speech_api_key || prev.google_speech_api_key || null,
            assemblyai_api_key: reloadResult.data.assemblyai_api_key || prev.assemblyai_api_key || null,
            deepgram_api_key: reloadResult.data.deepgram_api_key || prev.deepgram_api_key || null,
            anthropic_claude_api_key: reloadResult.data.anthropic_claude_api_key || prev.anthropic_claude_api_key || null,
            google_gemini_api_key: reloadResult.data.google_gemini_api_key || prev.google_gemini_api_key || null
          }))
          console.log('✅ Profile reloaded successfully')
        } else {
          console.warn('⚠️ Profile reload returned no data, keeping current state')
        }
      } catch (reloadError) {
        console.error('⚠️ Error reloading profile after save (non-critical):', reloadError)
        // Don't throw - the save was successful, reload is just for sync
      }
      
      setSaveMessage({ type: 'success', text: 'Settings saved!' })
      
      // Clear message after 3 seconds
      setTimeout(() => setSaveMessage(null), 3000)
    } catch (error) {
      console.error('❌ Error saving profile:', error)
      setSaveMessage({ type: 'error', text: error.message || 'Failed to save settings' })
    } finally {
      setSaving(false)
    }
  }, [user])

  const handleAvatarUpload = (avatarUrl) => {
    setProfile(prev => ({ ...prev, avatar_url: avatarUrl }))
    setSaveMessage({ type: 'success', text: 'Avatar updated!' })
    setTimeout(() => setSaveMessage(null), 3000)
  }

  const handleDisplayNameChange = (displayName) => {
    saveProfile({ display_name: displayName })
  }

  const handleSettingsChange = (updates) => {
    saveProfile(updates)
  }

  if (loading) {
    return (
      <Layout>
        <div className={styles.loadingContainer}>
          <div className={styles.spinner} />
          <p>Loading profile...</p>
        </div>
      </Layout>
    )
  }

  return (
    <Layout showCarousel={false} showTimerFooter={true} userId={user?.id}>
      <div className={styles.container}>
        <header className={styles.header}>
          <h1 className={styles.title}>Profile & Settings</h1>
          <p className={styles.subtitle}>
            Manage your profile and application preferences
          </p>
        </header>

        {saveMessage && (
          <div className={`${styles.saveMessage} ${styles[saveMessage.type]}`}>
            {saveMessage.type === 'success' ? (
              <svg viewBox="0 0 24 24" fill="currentColor" className={styles.messageIcon}>
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
              </svg>
            ) : saveMessage.type === 'warning' ? (
              <svg viewBox="0 0 24 24" fill="currentColor" className={styles.messageIcon}>
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="currentColor" className={styles.messageIcon}>
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
              </svg>
            )}
            {saveMessage.text}
            {saving && <span className={styles.savingDots}>...</span>}
          </div>
        )}

        <div className={styles.content}>
          <section className={styles.profileSection}>
            <ProfilePictureUpload
              currentAvatarUrl={profile.avatar_url}
              displayName={profile.display_name}
              userId={user?.id}
              onUploadComplete={handleAvatarUpload}
              onDisplayNameChange={handleDisplayNameChange}
            />
          </section>

          <section className={styles.settingsSection}>
            <ProfileSettings
              defaultCategoryId={profile.default_category_id}
              defaultTargetRevenue={profile.default_target_revenue}
              aiImageProvider={profile.ai_image_provider}
              aiAudioJournalProvider={profile.ai_audio_journal_provider}
              aiJournalInsightProvider={profile.ai_journal_insight_provider}
              nanoBananaApiKey={profile.nano_banana_api_key}
              googleAiApiKey={profile.google_ai_api_key}
              openaiApiKey={profile.openai_api_key}
              googleSpeechApiKey={profile.google_speech_api_key}
              assemblyaiApiKey={profile.assemblyai_api_key}
              deepgramApiKey={profile.deepgram_api_key}
              anthropicClaudeApiKey={profile.anthropic_claude_api_key}
              googleGeminiApiKey={profile.google_gemini_api_key}
              categories={categories}
              onSettingsChange={handleSettingsChange}
            />
          </section>
        </div>

        <div className={styles.accountInfo}>
          <h3>Account Information</h3>
          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>Email</span>
            <span className={styles.infoValue}>{user?.email}</span>
          </div>
          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>User ID</span>
            <span className={styles.infoValue}>{user?.id}</span>
          </div>
        </div>
      </div>
    </Layout>
  )
}

export default ProfilePage
