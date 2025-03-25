import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { Database } from '@/types/database'
import { CookieOptions } from '@supabase/ssr'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ 
              name, 
              value, 
              path: options.path,
              maxAge: options.maxAge,
              domain: options.domain,
              secure: options.secure,
              httpOnly: options.httpOnly,
              sameSite: options.sameSite
            })
          } catch {
            // Handle cookie setting error silently
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ 
              name, 
              value: '', 
              path: options.path,
              maxAge: 0,
              domain: options.domain,
              secure: options.secure,
              httpOnly: options.httpOnly,
              sameSite: options.sameSite
            })
          } catch {
            // Handle cookie removal error silently
          }
        },
      },
    }
  )
} 