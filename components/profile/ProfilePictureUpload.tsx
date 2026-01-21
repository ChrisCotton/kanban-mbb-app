import React, { useState, useRef } from 'react'
import styles from './ProfilePictureUpload.module.css'

interface ProfilePictureUploadProps {
  currentAvatarUrl: string | null
  displayName: string | null
  userId: string
  onUploadComplete: (avatarUrl: string) => void
  onDisplayNameChange: (name: string) => void
}

export default function ProfilePictureUpload({
  currentAvatarUrl,
  displayName,
  userId,
  onUploadComplete,
  onDisplayNameChange
}: ProfilePictureUploadProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [localDisplayName, setLocalDisplayName] = useState(displayName || '')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      setError('Please select a valid image file (JPEG, PNG, GIF, or WebP)')
      return
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      setError('File size must be less than 5MB')
      return
    }

    // Show preview
    const reader = new FileReader()
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string)
    }
    reader.readAsDataURL(file)

    // Upload
    setIsUploading(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('avatar', file)
      formData.append('user_id', userId)

      const response = await fetch('/api/profile/avatar', {
        method: 'POST',
        body: formData
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Upload failed')
      }

      onUploadComplete(result.avatar_url)
      setPreviewUrl(null)
    } catch (err: any) {
      setError(err.message || 'Failed to upload avatar')
      setPreviewUrl(null)
    } finally {
      setIsUploading(false)
    }
  }

  const handleDisplayNameBlur = () => {
    if (localDisplayName !== displayName) {
      onDisplayNameChange(localDisplayName)
    }
  }

  const getInitials = () => {
    if (localDisplayName) {
      return localDisplayName
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    }
    return '?'
  }

  const displayUrl = previewUrl || currentAvatarUrl

  return (
    <div className={styles.container}>
      <div className={styles.avatarSection}>
        <div 
          className={styles.avatarWrapper}
          onClick={() => fileInputRef.current?.click()}
        >
          {displayUrl ? (
            <img 
              src={displayUrl} 
              alt="Profile avatar" 
              className={styles.avatar}
            />
          ) : (
            <div className={styles.avatarPlaceholder}>
              {getInitials()}
            </div>
          )}
          
          <div className={styles.uploadOverlay}>
            <svg 
              className={styles.cameraIcon}
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2"
            >
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
            <span className={styles.uploadText}>
              {isUploading ? 'Uploading...' : 'Change'}
            </span>
          </div>

          {isUploading && (
            <div className={styles.loadingOverlay}>
              <div className={styles.spinner} />
            </div>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp"
          onChange={handleFileSelect}
          className={styles.fileInput}
          disabled={isUploading}
        />
      </div>

      <div className={styles.nameSection}>
        <label className={styles.label}>Display Name</label>
        <input
          type="text"
          value={localDisplayName}
          onChange={(e) => setLocalDisplayName(e.target.value)}
          onBlur={handleDisplayNameBlur}
          placeholder="Enter your display name"
          className={styles.nameInput}
          maxLength={100}
        />
      </div>

      {error && (
        <div className={styles.error}>
          <svg viewBox="0 0 24 24" fill="currentColor" className={styles.errorIcon}>
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
          </svg>
          {error}
        </div>
      )}

      <p className={styles.hint}>
        Click on the avatar to upload a new photo. Supports JPEG, PNG, GIF, WebP (max 5MB)
      </p>
    </div>
  )
}
