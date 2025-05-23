import { createClient } from '@supabase/supabase-js';
import { mockSupabase } from './mock-supabase';

// These environment variables need to be set in your .env.local file
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Check if we have valid Supabase credentials
const hasValidCredentials =
  supabaseUrl &&
  supabaseAnonKey &&
  !supabaseUrl.includes('your-supabase-url') &&
  !supabaseAnonKey.includes('your-supabase-anon-key');

// Use mock implementation if no valid credentials are provided
export const supabase = hasValidCredentials
  ? createClient(supabaseUrl, supabaseAnonKey)
  : mockSupabase as any; // Type cast to avoid TypeScript errors

// Log which implementation we're using
console.log(`Using ${hasValidCredentials ? 'real' : 'mock'} Supabase client`);
