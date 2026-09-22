// src/sync/supabaseClient.ts
// Supabase client — only VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
// are used (public/publishable keys only). Never expose service-role key here.

import { createClient } from '@supabase/supabase-js';

const DEFAULT_SUPABASE_URL = 'https://ymsctbbrzfmowfevqwfu.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inltc2N0YmJyemZtb3dmZXZxd2Z1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAwNTIwNjcsImV4cCI6MjEwNTYyODA2N30.2jougY91s-PgEXFIIqOQ5-sidOSNe1oCvJgPUULo7ro';

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string) || DEFAULT_SUPABASE_URL;
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || DEFAULT_SUPABASE_ANON_KEY;

// supabase client initialized with valid credentials
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export const isSupabaseConfigured = true;
