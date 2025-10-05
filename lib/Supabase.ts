// lib/Supabase.ts
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  'https://gggopknzksqvzisxylts.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdnZ29wa256a3Nxdnppc3h5bHRzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk1ODg3MjAsImV4cCI6MjA3NTE2NDcyMH0.JD6Lt61P9tDhjjKHtj3n299GJ1DD6-oJTJMu3BNJ-Jg'
);
