// This is the new, correct code for: src/lib/supabase/client.ts

import { createClient } from '@supabase/supabase-js'

// This is the Vite-specific way to access environment variables on the frontend.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// This check will now correctly identify if the variables are missing during the build.
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase URL and/or Anon Key are not set in the environment variables.')
}

// Initialize the Supabase client with the correct variables.
export const supabase = createClient(supabaseUrl, supabaseAnonKey) 