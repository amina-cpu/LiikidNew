// lib/SupabaseAdmin.ts
// Create a service role client that bypasses RLS for conversation creation
import { createClient } from '@supabase/supabase-js';

// Get these from your Supabase project settings
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || 'your-supabase-url';
const SUPABASE_SERVICE_ROLE_KEY = process.env.EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY || 'your-service-role-key';

// ⚠️ WARNING: Service role key bypasses RLS - only use for server-side operations
// For React Native, we'll use it carefully only for conversation creation
export const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Note: In production, you should move conversation creation to a Supabase Edge Function
// This is a temporary workaround for development