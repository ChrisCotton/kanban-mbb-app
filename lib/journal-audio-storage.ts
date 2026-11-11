/**
 * Shared journal audio naming / validation for Storage + API routes.
 * Keeps paths consistent between client uploads and `/api/journal/audio`.
 */

const ALLOWED_BASE_TYPES = ['audio/webm', 'audio/mp4', 'audio/mpeg', 'audio/ogg', 'audio/wav']

/**
 * Storage and multipart uploads reject parameterized types such as
 * `audio/webm;codecs=opus`. Safari may also label an audio-only take `video/mp4`.
 */
export function normalizeJournalAudioContentType(mimeType: string | null | undefined): string {
  const raw = (mimeType || 'audio/webm').toLowerCase().trim()
  const base = raw.split(';')[0].trim()

  if (base === 'video/mp4' || base === 'audio/m4a' || base === 'audio/x-m4a' || base === 'audio/aac') {
    return 'audio/mp4'
  }
  if (base === 'video/webm') return 'audio/webm'
  if (base === 'audio/wave' || base === 'audio/x-wav') return 'audio/wav'
  if (base === 'audio/mpeg3' || base === 'audio/x-mpeg-3' || base === 'audio/mp3') return 'audio/mpeg'
  if (ALLOWED_BASE_TYPES.includes(base)) return base
  return 'audio/webm'
}

export const ALLOWED_JOURNAL_AUDIO_TYPES = [
  'audio/webm',
  'audio/webm;codecs=opus',
  'audio/webm;codecs=vorbis',
  'audio/mp4',
  'audio/mp4;codecs=mp4a.40.2',
  'audio/mpeg',
  'audio/mpeg3',
  'audio/x-mpeg-3',
  'audio/ogg',
  'audio/ogg;codecs=opus',
  'audio/ogg;codecs=vorbis',
  'audio/wav',
  'audio/wave',
  'audio/x-wav',
]

export function isAllowedJournalAudioMimeType(mimeType: string | null | undefined): boolean {
  if (!mimeType) return false
  const normalized = mimeType.toLowerCase().trim()
  if (ALLOWED_JOURNAL_AUDIO_TYPES.includes(normalized)) return true
  const baseType = normalized.split(';')[0].trim()
  if (ALLOWED_BASE_TYPES.includes(baseType)) return true
  return (
    baseType === 'video/mp4' ||
    baseType === 'video/webm' ||
    baseType === 'audio/m4a' ||
    baseType === 'audio/x-m4a' ||
    baseType === 'audio/aac' ||
    baseType === 'audio/mp3'
  )
}

export function getJournalAudioFileExtension(blobType: string): string {
  const baseMimeType = normalizeJournalAudioContentType(blobType)
  switch (baseMimeType) {
    case 'audio/webm':
      return '.webm'
    case 'audio/mp4':
      return '.m4a'
    case 'audio/mpeg':
    case 'audio/mpeg3':
      return '.mp3'
    case 'audio/ogg':
      return '.ogg'
    case 'audio/wav':
    case 'audio/wave':
    case 'audio/x-wav':
      return '.wav'
    default:
      return '.webm'
  }
}

export function buildJournalAudioStoragePath(
  userId: string,
  entryId: string,
  blobType: string
): string {
  return `${userId}/${entryId}${getJournalAudioFileExtension(blobType)}`
}
