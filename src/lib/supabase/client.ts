// This is the new, correct code for: src/lib/supabase/client.ts

import { createClient } from '@supabase/supabase-js'

// This is the Vite-specific way to access environment variables on the frontend.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-anon-key'

// Warn if using placeholder values
if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
  console.warn('⚠️  Supabase environment variables not set. Using placeholder values. Auth features will not work.')
}

// Initialize the Supabase client with explicit auth options for local development
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    detectSessionInUrl: true,
    persistSession: true,
    autoRefreshToken: true,
    flowType: 'implicit'
  }
}) 