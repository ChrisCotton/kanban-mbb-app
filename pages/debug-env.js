export default function DebugEnv() {
  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h1>Environment Variables Debug</h1>
      <p><strong>NEXT_PUBLIC_SUPABASE_URL:</strong> {process.env.NEXT_PUBLIC_SUPABASE_URL || 'NOT SET'}</p>
      <p><strong>NEXT_PUBLIC_SUPABASE_ANON_KEY:</strong> {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'SET (hidden)' : 'NOT SET'}</p>
      <p><strong>NEXT_PUBLIC_SUPABASE_ANON_KEY (first 20 chars):</strong> {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.substring(0, 20) || 'NOT SET'}</p>
      
      <h2>Server-side Check</h2>
      <button onClick={async () => {
        const response = await fetch('/api/debug-env')
        const data = await response.json()
        alert(JSON.stringify(data, null, 2))
      }}>
        Check Server Environment Variables
      </button>
    </div>
  )
} 