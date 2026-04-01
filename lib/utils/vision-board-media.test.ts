import {
  isVisionBoardVideo,
  visionBoardVideoThumbnailSrc,
} from './vision-board-media'

describe('vision-board-media', () => {
  describe('isVisionBoardVideo', () => {
    it('returns true when media_type is video', () => {
      expect(isVisionBoardVideo('video', 'https://x.com/a.jpg')).toBe(true)
    })

    it('still detects video from path when media_type is wrong', () => {
      expect(isVisionBoardVideo('image', 'https://x.com/a.mp4')).toBe(true)
    })

    it('infers video from file extension when media_type missing', () => {
      expect(isVisionBoardVideo(undefined, 'https://cdn/x/file.MP4')).toBe(true)
      expect(isVisionBoardVideo(null, 'path/to/clip.webm')).toBe(true)
      expect(isVisionBoardVideo('', 'clip.mov?token=1')).toBe(true)
    })

    it('returns false for image paths without video type', () => {
      expect(isVisionBoardVideo(undefined, 'https://x.com/photo.jpg')).toBe(false)
    })
  })

  describe('visionBoardVideoThumbnailSrc', () => {
    it('appends media fragment for first-frame hint', () => {
      expect(visionBoardVideoThumbnailSrc('https://x.com/v.mp4')).toBe(
        'https://x.com/v.mp4#t=0.001'
      )
    })

    it('replaces existing hash', () => {
      expect(visionBoardVideoThumbnailSrc('https://x.com/v.mp4#t=2')).toBe(
        'https://x.com/v.mp4#t=0.001'
      )
    })
  })
})
