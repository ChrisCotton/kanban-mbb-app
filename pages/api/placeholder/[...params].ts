import type { NextApiRequest, NextApiResponse } from 'next'

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const { params } = req.query
  
  // Parse dimensions and text from params
  const pathParts = Array.isArray(params) ? params : [params]
  const [dimensions, ...textParts] = pathParts
  
  // Parse dimensions (e.g., "800/400")
  const [width = '800', height = '400'] = dimensions?.split('/') || []
  
  // Parse text from query params
  const text = req.query.text as string || textParts.join(' ') || 'Placeholder'
  
  // Create SVG placeholder
  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#667eea;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#764ba2;stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#grad)"/>
      <text x="50%" y="50%" font-family="Arial, sans-serif" font-size="24" 
            font-weight="bold" text-anchor="middle" dominant-baseline="middle" 
            fill="white" text-shadow="2px 2px 4px rgba(0,0,0,0.8)">
        ${decodeURIComponent(text)}
      </text>
      <text x="50%" y="70%" font-family="Arial, sans-serif" font-size="14" 
            text-anchor="middle" dominant-baseline="middle" 
            fill="rgba(255,255,255,0.8)">
        ${width} × ${height}
      </text>
    </svg>
  `
  
  res.setHeader('Content-Type', 'image/svg+xml')
  res.setHeader('Cache-Control', 'public, max-age=31536000')
  res.status(200).send(svg)
} 