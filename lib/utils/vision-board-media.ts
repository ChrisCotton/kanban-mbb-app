const VIDEO_EXT = /\.(mp4|webm|mov|m4v|ogv)(\?|#|$)/i

export function isVisionBoardVideo(
  mediaType: string | null | undefined,
  filePath: string | null | undefined
): boolean {
  if (mediaType === 'video') return true
  if (!filePath) return false
  // Prefer URL extension so mis-tagged rows still render (carousel uses the same rule).
  return VIDEO_EXT.test(filePath)
}

/** Media fragment nudges many browsers to decode and show a first frame for `<video>` thumbnails. */
export function visionBoardVideoThumbnailSrc(url: string): string {
  if (!url) return url
  const hashIdx = url.indexOf('#')
  const base = hashIdx >= 0 ? url.slice(0, hashIdx) : url
  return `${base}#t=0.001`
}
