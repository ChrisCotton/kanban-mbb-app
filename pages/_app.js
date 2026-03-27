import '../styles/globals.css'
import { Toaster } from 'react-hot-toast'
import { TimerContextProvider } from '../contexts/TimerContext'
import { useEffect } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabase'

export default function App({ Component, pageProps }) {
  const router = useRouter()

  // Stale sessions (e.g. after admin password reset) leave invalid refresh tokens in storage.
  // Clear them so login page does not spam AuthApiError / 400 on token refresh.
  useEffect(() => {
    supabase.auth.getSession().then(({ error }) => {
      if (!error) return
      const msg = (error.message || '').toLowerCase()
      if (msg.includes('refresh') || msg.includes('invalid')) {
        supabase.auth.signOut({ scope: 'local' })
      }
    })
  }, [])
  
  useEffect(() => {
    const handleRouteChangeStart = (url) => {}
    const handleRouteChangeComplete = (url) => {}
    const handleRouteChangeError = (err, url) => {}

    router.events.on('routeChangeStart', handleRouteChangeStart)
    router.events.on('routeChangeComplete', handleRouteChangeComplete)
    router.events.on('routeChangeError', handleRouteChangeError)
    
    return () => {
      router.events.off('routeChangeStart', handleRouteChangeStart)
      router.events.off('routeChangeComplete', handleRouteChangeComplete)
      router.events.off('routeChangeError', handleRouteChangeError)
    }
  }, [router])
  
  return (
    <TimerContextProvider>
      <Component {...pageProps} />
      <Toaster
        position="bottom-right"
        toastOptions={{
          className: 'bg-white/10 backdrop-blur-md border border-white/20 text-white',
          style: {
            background: 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            color: 'white'
          }
        }}
      />
    </TimerContextProvider>
  )
}
