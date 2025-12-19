/**
 * Supabase server-side client with service role key
 * Use this for server-side operations that need to bypass RLS
 * DO NOT expose this key to the client
 */

import { createClient } from '@supabase/supabase-js';

// Get Supabase credentials from environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseServiceKey) {
  console.warn('Supabase service role key not configured. Please set SUPABASE_SERVICE_ROLE_KEY in your .env.local file.');
}

// Create Supabase client with service role key (bypasses RLS)
export const supabaseServer = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

