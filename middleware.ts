import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// This function can be marked `async` if using `await` inside
export function middleware(request: NextRequest) {
  // Get the pathname
  const pathname = request.nextUrl.pathname
  
  // Get the origin from the request
  const origin = request.headers.get('origin') || '*'
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || '*'
  
  // Choose the correct origin
  const allowedOrigin = origin === 'null' ? '*' : origin
  
  // Handle OPTIONS preflight requests
  if (request.method === 'OPTIONS') {
    const response = new NextResponse(null, {
      status: 204,
    })
    
    // Add CORS headers to preflight response
    response.headers.set('Access-Control-Allow-Credentials', 'true')
    response.headers.set('Access-Control-Allow-Origin', allowedOrigin)
    response.headers.set('Access-Control-Allow-Methods', 'GET,DELETE,PATCH,POST,PUT')
    response.headers.set(
      'Access-Control-Allow-Headers',
      'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
    )
    
    return response
  }

  // Check if the request is for a protected route and the user is not authenticated
  // This is a simplified check - in practice, you would validate the session token
  const isAuthRoute = pathname.startsWith('/auth/')
  const isDashboardRoute = pathname === '/dashboard' || pathname.startsWith('/dashboard/')
  const isApiRoute = pathname.startsWith('/api/')
  
  // Clone the request headers
  const requestHeaders = new Headers(request.headers)
  const response = NextResponse.next({
    request: {
      // Apply new request headers
      headers: requestHeaders,
    },
  })

  // Add CORS headers
  response.headers.set('Access-Control-Allow-Credentials', 'true')
  response.headers.set('Access-Control-Allow-Origin', allowedOrigin)
  response.headers.set('Access-Control-Allow-Methods', 'GET,DELETE,PATCH,POST,PUT')
  response.headers.set(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  )

  return response
}

// See "Matching Paths" below to learn more
export const config = {
  matcher: [
    // Apply to all API routes
    '/api/:path*',
    // Apply to auth endpoints that Supabase needs
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
} 