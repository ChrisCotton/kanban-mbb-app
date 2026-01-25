import React, { useState, useEffect } from 'react'
import { 
  AI_IMAGE_PROVIDERS, 
  AI_AUDIO_PROVIDERS, 
  AI_JOURNAL_PROVIDERS 
} from '../../pages/api/profile'
import { useGoalTextPreference } from '../../hooks/useGoalTextPreference'
import { useFileNamePreference } from '../../hooks/useFileNamePreference'
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
  nanoBananaApiKey?: string | null
  googleAiApiKey?: string | null
  openaiApiKey?: string | null
  googleSpeechApiKey?: string | null
  assemblyaiApiKey?: string | null
  deepgramApiKey?: string | null
  anthropicClaudeApiKey?: string | null
  googleGeminiApiKey?: string | null
  categories: Category[]
  onSettingsChange: (settings: Partial<ProfileSettingsData>) => void
}

export interface ProfileSettingsData {
  default_category_id: string | null
  default_target_revenue: number
  ai_image_provider: string
  ai_audio_journal_provider: string
  ai_journal_insight_provider: string
  nano_banana_api_key?: string | null
  google_ai_api_key?: string | null
  openai_api_key?: string | null
  google_speech_api_key?: string | null
  assemblyai_api_key?: string | null
  deepgram_api_key?: string | null
  anthropic_claude_api_key?: string | null
  google_gemini_api_key?: string | null
}

export default function ProfileSettings({
  defaultCategoryId,
  defaultTargetRevenue,
  aiImageProvider,
  aiAudioJournalProvider,
  aiJournalInsightProvider,
  nanoBananaApiKey,
  googleAiApiKey,
  openaiApiKey,
  googleSpeechApiKey,
  assemblyaiApiKey,
  deepgramApiKey,
  anthropicClaudeApiKey,
  googleGeminiApiKey,
  categories,
  onSettingsChange
}: ProfileSettingsProps) {
  const { enabled: goalTextEnabled, toggle: toggleGoalText } = useGoalTextPreference()
  const { enabled: fileNameEnabled, toggle: toggleFileName } = useFileNamePreference()
  
  const [localSettings, setLocalSettings] = useState<ProfileSettingsData>({
    default_category_id: defaultCategoryId,
    default_target_revenue: defaultTargetRevenue,
    ai_image_provider: aiImageProvider,
    ai_audio_journal_provider: aiAudioJournalProvider,
    ai_journal_insight_provider: aiJournalInsightProvider,
    nano_banana_api_key: nanoBananaApiKey || '',
    google_ai_api_key: googleAiApiKey || '',
    openai_api_key: openaiApiKey || '',
    google_speech_api_key: googleSpeechApiKey || '',
    assemblyai_api_key: assemblyaiApiKey || '',
    deepgram_api_key: deepgramApiKey || '',
    anthropic_claude_api_key: anthropicClaudeApiKey || '',
    google_gemini_api_key: googleGeminiApiKey || ''
  })

  useEffect(() => {
    setLocalSettings({
      default_category_id: defaultCategoryId,
      default_target_revenue: defaultTargetRevenue,
      ai_image_provider: aiImageProvider,
      ai_audio_journal_provider: aiAudioJournalProvider,
      ai_journal_insight_provider: aiJournalInsightProvider,
      nano_banana_api_key: nanoBananaApiKey || '',
      google_ai_api_key: googleAiApiKey || '',
      openai_api_key: openaiApiKey || '',
      google_speech_api_key: googleSpeechApiKey || '',
      assemblyai_api_key: assemblyaiApiKey || '',
      deepgram_api_key: deepgramApiKey || '',
      anthropic_claude_api_key: anthropicClaudeApiKey || '',
      google_gemini_api_key: googleGeminiApiKey || ''
    })
  }, [defaultCategoryId, defaultTargetRevenue, aiImageProvider, aiAudioJournalProvider, aiJournalInsightProvider, nanoBananaApiKey, googleAiApiKey, openaiApiKey, googleSpeechApiKey, assemblyaiApiKey, deepgramApiKey, anthropicClaudeApiKey, googleGeminiApiKey])

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

      <h2 className={styles.sectionTitle}>Vision Board Preferences</h2>

      {/* Goal Text Visibility */}
      <div className={styles.settingGroup}>
        <div className={styles.settingHeader}>
          <label className={styles.label}>
            <span className={styles.aiIcon}>🎯</span>
            Show Goal Text
          </label>
          <span className={styles.hint}>Display goal text overlay on vision board images</span>
        </div>
        <div className={styles.toggleContainer}>
          <button
            type="button"
            onClick={toggleGoalText}
            className={`${styles.toggle} ${goalTextEnabled ? styles.toggleOn : styles.toggleOff}`}
            aria-label={`${goalTextEnabled ? 'Hide' : 'Show'} goal text`}
          >
            <span className={styles.toggleSlider} />
          </button>
          <span className={styles.toggleLabel}>
            {goalTextEnabled ? 'Enabled' : 'Disabled'}
          </span>
        </div>
      </div>

      {/* File Name Visibility */}
      <div className={styles.settingGroup}>
        <div className={styles.settingHeader}>
          <label className={styles.label}>
            <span className={styles.aiIcon}>📄</span>
            Show File Name
          </label>
          <span className={styles.hint}>Display file name below goal text on vision board images</span>
        </div>
        <div className={styles.toggleContainer}>
          <button
            type="button"
            onClick={toggleFileName}
            className={`${styles.toggle} ${fileNameEnabled ? styles.toggleOn : styles.toggleOff}`}
            aria-label={`${fileNameEnabled ? 'Hide' : 'Show'} file name`}
          >
            <span className={styles.toggleSlider} />
          </button>
          <span className={styles.toggleLabel}>
            {fileNameEnabled ? 'Enabled' : 'Disabled'}
          </span>
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
        
        {/* API Key Inputs for Audio Transcription Providers */}
        {localSettings.ai_audio_journal_provider === 'openai_whisper' && (
          <div className={styles.apiKeyContainer}>
            <label className={styles.apiKeyLabel}>
              OpenAI API Key
              <span className={styles.hint}>Required for Whisper transcription</span>
            </label>
            <input
              type="password"
              value={localSettings.openai_api_key || ''}
              onChange={(e) => handleChange('openai_api_key', e.target.value)}
              placeholder="sk-..."
              className={styles.apiKeyInput}
            />
            <a 
              href="https://platform.openai.com/api-keys" 
              target="_blank" 
              rel="noopener noreferrer"
              className={styles.apiKeyLink}
            >
              Get API key from OpenAI Platform →
            </a>
          </div>
        )}
        
        {localSettings.ai_audio_journal_provider === 'google_speech' && (
          <div className={styles.apiKeyContainer}>
            <label className={styles.apiKeyLabel}>
              Google Cloud Speech-to-Text API Key
              <span className={styles.hint}>Required for Google Speech transcription</span>
            </label>
            <input
              type="password"
              value={localSettings.google_speech_api_key || ''}
              onChange={(e) => handleChange('google_speech_api_key', e.target.value)}
              placeholder="Enter your Google Cloud API key"
              className={styles.apiKeyInput}
            />
            <a 
              href="https://console.cloud.google.com/apis/credentials" 
              target="_blank" 
              rel="noopener noreferrer"
              className={styles.apiKeyLink}
            >
              Get API key from Google Cloud Console →
            </a>
          </div>
        )}
        
        {localSettings.ai_audio_journal_provider === 'assemblyai' && (
          <div className={styles.apiKeyContainer}>
            <label className={styles.apiKeyLabel}>
              AssemblyAI API Key
              <span className={styles.hint}>Required for AssemblyAI transcription</span>
            </label>
            <input
              type="password"
              value={localSettings.assemblyai_api_key || ''}
              onChange={(e) => handleChange('assemblyai_api_key', e.target.value)}
              placeholder="Enter your AssemblyAI API key"
              className={styles.apiKeyInput}
            />
            <a 
              href="https://www.assemblyai.com/app/account" 
              target="_blank" 
              rel="noopener noreferrer"
              className={styles.apiKeyLink}
            >
              Get API key from AssemblyAI →
            </a>
          </div>
        )}
        
        {localSettings.ai_audio_journal_provider === 'deepgram' && (
          <div className={styles.apiKeyContainer}>
            <label className={styles.apiKeyLabel}>
              Deepgram API Key
              <span className={styles.hint}>Required for Deepgram transcription</span>
            </label>
            <input
              type="password"
              value={localSettings.deepgram_api_key || ''}
              onChange={(e) => handleChange('deepgram_api_key', e.target.value)}
              placeholder="Enter your Deepgram API key"
              className={styles.apiKeyInput}
            />
            <a 
              href="https://console.deepgram.com/signup" 
              target="_blank" 
              rel="noopener noreferrer"
              className={styles.apiKeyLink}
            >
              Get API key from Deepgram →
            </a>
          </div>
        )}
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
        
        {/* API Key Inputs for Journal Insight LLMs */}
        {localSettings.ai_journal_insight_provider === 'openai_gpt4' && (
          <div className={styles.apiKeyContainer}>
            <label className={styles.apiKeyLabel}>
              OpenAI API Key
              <span className={styles.hint}>Required for GPT-4 journal insights</span>
            </label>
            <input
              type="password"
              value={localSettings.openai_api_key || ''}
              onChange={(e) => handleChange('openai_api_key', e.target.value)}
              placeholder="sk-..."
              className={styles.apiKeyInput}
            />
            <a 
              href="https://platform.openai.com/api-keys" 
              target="_blank" 
              rel="noopener noreferrer"
              className={styles.apiKeyLink}
            >
              Get API key from OpenAI Platform →
            </a>
          </div>
        )}
        
        {localSettings.ai_journal_insight_provider === 'anthropic_claude' && (
          <div className={styles.apiKeyContainer}>
            <label className={styles.apiKeyLabel}>
              Anthropic Claude API Key
              <span className={styles.hint}>Required for Claude journal insights</span>
            </label>
            <input
              type="password"
              value={localSettings.anthropic_claude_api_key || ''}
              onChange={(e) => handleChange('anthropic_claude_api_key', e.target.value)}
              placeholder="sk-ant-..."
              className={styles.apiKeyInput}
            />
            <a 
              href="https://console.anthropic.com/settings/keys" 
              target="_blank" 
              rel="noopener noreferrer"
              className={styles.apiKeyLink}
            >
              Get API key from Anthropic Console →
            </a>
          </div>
        )}
        
        {localSettings.ai_journal_insight_provider === 'google_gemini' && (
          <div className={styles.apiKeyContainer}>
            <label className={styles.apiKeyLabel}>
              Google Gemini API Key
              <span className={styles.hint}>Required for Gemini journal insights</span>
            </label>
            <input
              type="password"
              value={localSettings.google_gemini_api_key || ''}
              onChange={(e) => handleChange('google_gemini_api_key', e.target.value)}
              placeholder="Enter your Google Gemini API key"
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
