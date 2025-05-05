import { createClient } from '@supabase/supabase-js'

// Load environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Basic check
if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    'Supabase URL or Anon Key is missing. Make sure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in your .env.local file.'
  )
  // Optionally throw an error or return a dummy client depending on desired robustness
  // throw new Error('Supabase environment variables not set.');
}

// Create and export the Supabase client instance
// Note: We are NOT using persistSession: false here, as this client is for the browser
// where session persistence is usually desired (though relies on Supabase Auth integration later).
export const supabase = createClient(supabaseUrl!, supabaseAnonKey!)

// You can add specific helper functions here later if needed, e.g.:
// export const saveChatMessage = async (...) => { ... }
// export const getChatHistory = async (...) => { ... } 