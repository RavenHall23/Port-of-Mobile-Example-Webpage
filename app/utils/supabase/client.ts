import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl) {
  throw new Error('Missing env.NEXT_PUBLIC_SUPABASE_URL')
}
if (!supabaseKey) {
  throw new Error('Missing env.NEXT_PUBLIC_SUPABASE_ANON_KEY')
}

// Function to detect device type
const getDeviceType = () => {
  if (typeof window === 'undefined') return 'unknown';
  
  const ua = navigator.userAgent;
  if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
    return 'tablet';
  }
  if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) {
    return 'mobile';
  }
  return 'desktop';
};

// Function to generate a unique device ID
const getDeviceId = () => {
  if (typeof window === 'undefined') return 'unknown';
  
  let deviceId = localStorage.getItem('device_id');
  if (!deviceId) {
    deviceId = crypto.randomUUID();
    localStorage.setItem('device_id', deviceId);
  }
  return deviceId;
};

export const createClient = () => {
  console.log('Creating Supabase client with URL:', supabaseUrl)
  return createBrowserClient(
    supabaseUrl,
    supabaseKey,
    {
      global: {
        headers: {
          'x-device-type': getDeviceType(),
          'x-device-id': getDeviceId(),
          'x-forwarded-for': typeof window !== 'undefined' ? window.location.hostname : '127.0.0.1'
        }
      }
    }
  )
} 