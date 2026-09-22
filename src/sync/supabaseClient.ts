// src/sync/supabaseClient.ts
// Supabase client — only VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
// are used (public/publishable keys only). Never expose service-role key here.

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

// supabase is null when env vars are not configured (offline-only mode)
export const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      })
    : null;

export const isSupabaseConfigured = !!supabase;
