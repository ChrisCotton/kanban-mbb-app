import '../styles/globals.css'
import { Toaster } from 'react-hot-toast'
import { TimerContextProvider } from '../contexts/TimerContext'

export default function App({ Component, pageProps }) {
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
