export default function TestEnv() {
  return (
    <div>
      <h1>Environment Variables Test</h1>
      <pre>
        {JSON.stringify({
          url: process.env.NEXT_PUBLIC_SUPABASE_URL,
          hasKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        }, null, 2)}
      </pre>
    </div>
  )
} 