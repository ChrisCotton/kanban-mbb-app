import '../styles/globals.css'
import { Toaster } from 'react-hot-toast'
import { TimerContextProvider } from '../contexts/TimerContext'
import { useEffect } from 'react'
import { useRouter } from 'next/router'

export default function App({ Component, pageProps }) {
  const router = useRouter()
  
  useEffect(() => {
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/9600b6eb-feac-4179-91f9-fecc0082b44b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'pages/_app.js:8',message:'Router event listener setup',data:{pathname:router.pathname},timestamp:Date.now(),runId:'initial',hypothesisId:'D'})}).catch(()=>{});
    // #endregion
    
    const handleRouteChangeStart = (url) => {
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/9600b6eb-feac-4179-91f9-fecc0082b44b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'pages/_app.js:11',message:'Route change start',data:{url,pathname:router.pathname},timestamp:Date.now(),runId:'initial',hypothesisId:'D'})}).catch(()=>{});
      // #endregion
    }
    
    const handleRouteChangeComplete = (url) => {
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/9600b6eb-feac-4179-91f9-fecc0082b44b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'pages/_app.js:16',message:'Route change complete',data:{url,pathname:router.pathname},timestamp:Date.now(),runId:'initial',hypothesisId:'D'})}).catch(()=>{});
      // #endregion
    }
    
    const handleRouteChangeError = (err, url) => {
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/9600b6eb-feac-4179-91f9-fecc0082b44b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'pages/_app.js:21',message:'Route change error',data:{url,error:err?.message},timestamp:Date.now(),runId:'initial',hypothesisId:'D'})}).catch(()=>{});
      // #endregion
    }
    
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
