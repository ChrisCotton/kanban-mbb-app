import {
  buildJournalAudioStoragePath,
  isAllowedJournalAudioMimeType,
  normalizeJournalAudioContentType,
} from '../journal-audio-storage'

describe('journal audio storage helpers', () => {
  it('strips codec parameters that storage rejects', () => {
    expect(normalizeJournalAudioContentType('audio/webm;codecs=opus')).toBe('audio/webm')
    expect(normalizeJournalAudioContentType('audio/mp4;codecs=mp4a.40.2')).toBe('audio/mp4')
  })

  it('maps Safari audio-only video/mp4 to audio/mp4', () => {
    expect(normalizeJournalAudioContentType('video/mp4')).toBe('audio/mp4')
    expect(isAllowedJournalAudioMimeType('video/mp4')).toBe(true)
  })

  it('builds a storage path from the normalized type', () => {
    expect(
      buildJournalAudioStoragePath('user-1', 'entry-1', 'audio/webm;codecs=opus')
    ).toBe('user-1/entry-1.webm')
    expect(buildJournalAudioStoragePath('user-1', 'entry-1', 'video/mp4')).toBe(
      'user-1/entry-1.m4a'
    )
  })
})
