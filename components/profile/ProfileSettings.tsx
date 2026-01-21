import React, { useState, useEffect } from 'react'
import { 
  AI_IMAGE_PROVIDERS, 
  AI_AUDIO_PROVIDERS, 
  AI_JOURNAL_PROVIDERS 
} from '../../pages/api/profile'
import styles from './ProfileSettings.module.css'

interface Category {
  id: string
  name: string
  hourly_rate?: number
}

interface ProfileSettingsProps {
  defaultCategoryId: string | null
  defaultTargetRevenue: number
  aiImageProvider: string
  aiAudioJournalProvider: string
  aiJournalInsightProvider: string
  categories: Category[]
  onSettingsChange: (settings: Partial<ProfileSettingsData>) => void
}

export interface ProfileSettingsData {
  default_category_id: string | null
  default_target_revenue: number
  ai_image_provider: string
  ai_audio_journal_provider: string
  ai_journal_insight_provider: string
}

export default function ProfileSettings({
  defaultCategoryId,
  defaultTargetRevenue,
  aiImageProvider,
  aiAudioJournalProvider,
  aiJournalInsightProvider,
  nanoBananaApiKey,
  googleAiApiKey,
  categories,
  onSettingsChange
}: ProfileSettingsProps) {
  const [localSettings, setLocalSettings] = useState<ProfileSettingsData>({
    default_category_id: defaultCategoryId,
    default_target_revenue: defaultTargetRevenue,
    ai_image_provider: aiImageProvider,
    ai_audio_journal_provider: aiAudioJournalProvider,
    ai_journal_insight_provider: aiJournalInsightProvider,
    nano_banana_api_key: nanoBananaApiKey || '',
    google_ai_api_key: googleAiApiKey || ''
  })

  useEffect(() => {
    setLocalSettings({
      default_category_id: defaultCategoryId,
      default_target_revenue: defaultTargetRevenue,
      ai_image_provider: aiImageProvider,
      ai_audio_journal_provider: aiAudioJournalProvider,
      ai_journal_insight_provider: aiJournalInsightProvider,
      nano_banana_api_key: nanoBananaApiKey || '',
      google_ai_api_key: googleAiApiKey || ''
    })
  }, [defaultCategoryId, defaultTargetRevenue, aiImageProvider, aiAudioJournalProvider, aiJournalInsightProvider, nanoBananaApiKey, googleAiApiKey])

  const handleChange = (field: keyof ProfileSettingsData, value: string | number | null) => {
    const newSettings = { ...localSettings, [field]: value }
    setLocalSettings(newSettings)
    onSettingsChange({ [field]: value })
  }

  return (
    <div className={styles.container}>
      <h2 className={styles.sectionTitle}>Application Settings</h2>
      
      {/* Default Category */}
      <div className={styles.settingGroup}>
        <div className={styles.settingHeader}>
          <label className={styles.label}>Default Category</label>
          <span className={styles.hint}>Applied to new tasks when no category is selected</span>
        </div>
        <select
          value={localSettings.default_category_id || ''}
          onChange={(e) => handleChange('default_category_id', e.target.value || null)}
          className={styles.select}
        >
          <option value="">No default category</option>
          {categories.map(cat => (
            <option key={cat.id} value={cat.id}>
              {cat.name} {cat.hourly_rate ? `($${cat.hourly_rate}/hr)` : ''}
            </option>
          ))}
        </select>
      </div>

      {/* Default Target Revenue */}
      <div className={styles.settingGroup}>
        <div className={styles.settingHeader}>
          <label className={styles.label}>Default Target Revenue</label>
          <span className={styles.hint}>Used when Set Target dialog has no value</span>
        </div>
        <div className={styles.inputWithPrefix}>
          <span className={styles.prefix}>$</span>
          <input
            type="number"
            value={localSettings.default_target_revenue}
            onChange={(e) => handleChange('default_target_revenue', parseFloat(e.target.value) || 0)}
            min="0"
            step="100"
            className={styles.numberInput}
          />
        </div>
      </div>

      <div className={styles.divider} />

      <h2 className={styles.sectionTitle}>AI Providers</h2>

      {/* AI Image Generation */}
      <div className={styles.settingGroup}>
        <div className={styles.settingHeader}>
          <label className={styles.label}>
            <span className={styles.aiIcon}>🎨</span>
            Image Generation AI
          </label>
          <span className={styles.hint}>For Vision Board image generation</span>
        </div>
        <select
          value={localSettings.ai_image_provider}
          onChange={(e) => handleChange('ai_image_provider', e.target.value)}
          className={styles.select}
        >
          {AI_IMAGE_PROVIDERS.map(provider => (
            <option key={provider.id} value={provider.id}>
              {provider.name} - {provider.description}
            </option>
          ))}
        </select>
        
        {/* API Key Input for Nano Banana */}
        {localSettings.ai_image_provider === 'nano_banana' && (
          <div className={styles.apiKeyContainer}>
            <label className={styles.apiKeyLabel}>
              Nano Banana API Key
              <span className={styles.hint}>Required for image generation</span>
            </label>
            <input
              type="password"
              value={localSettings.nano_banana_api_key || ''}
              onChange={(e) => handleChange('nano_banana_api_key', e.target.value)}
              placeholder="Enter your Nano Banana API key"
              className={styles.apiKeyInput}
            />
            <a 
              href="https://nanobanana.ai" 
              target="_blank" 
              rel="noopener noreferrer"
              className={styles.apiKeyLink}
            >
              Get API key from Nano Banana →
            </a>
          </div>
        )}
        
        {/* API Key Input for Google Veo 3 */}
        {localSettings.ai_image_provider === 'veo_3' && (
          <div className={styles.apiKeyContainer}>
            <label className={styles.apiKeyLabel}>
              Google AI API Key
              <span className={styles.hint}>Required for Veo 3 / Imagen 3</span>
            </label>
            <input
              type="password"
              value={localSettings.google_ai_api_key || ''}
              onChange={(e) => handleChange('google_ai_api_key', e.target.value)}
              placeholder="Enter your Google AI API key"
              className={styles.apiKeyInput}
            />
            <a 
              href="https://makersuite.google.com/app/apikey" 
              target="_blank" 
              rel="noopener noreferrer"
              className={styles.apiKeyLink}
            >
              Get API key from Google AI Studio →
            </a>
          </div>
        )}
      </div>

      {/* AI Audio Journal */}
      <div className={styles.settingGroup}>
        <div className={styles.settingHeader}>
          <label className={styles.label}>
            <span className={styles.aiIcon}>🎙️</span>
            Audio Journal AI
          </label>
          <span className={styles.hint}>For transcription and sentiment analysis</span>
        </div>
        <select
          value={localSettings.ai_audio_journal_provider}
          onChange={(e) => handleChange('ai_audio_journal_provider', e.target.value)}
          className={styles.select}
        >
          {AI_AUDIO_PROVIDERS.map(provider => (
            <option key={provider.id} value={provider.id}>
              {provider.name} - {provider.description}
            </option>
          ))}
        </select>
      </div>

      {/* AI Journal Insight */}
      <div className={styles.settingGroup}>
        <div className={styles.settingHeader}>
          <label className={styles.label}>
            <span className={styles.aiIcon}>🧠</span>
            Journal Insight LLM
          </label>
          <span className={styles.hint}>For long-term journal analysis and insights</span>
        </div>
        <select
          value={localSettings.ai_journal_insight_provider}
          onChange={(e) => handleChange('ai_journal_insight_provider', e.target.value)}
          className={styles.select}
        >
          {AI_JOURNAL_PROVIDERS.map(provider => (
            <option key={provider.id} value={provider.id}>
              {provider.name} - {provider.description}
            </option>
          ))}
        </select>
        {localSettings.ai_journal_insight_provider === 'cognee_memory' && (
          <div className={styles.comingSoon}>
            <span className={styles.badge}>Coming Soon</span>
            Cognee memory layer integration is under development
          </div>
        )}
      </div>
    </div>
  )
}
