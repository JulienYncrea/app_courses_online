// supabaseClient.js
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://cepqcretnxfhjbvdukkk.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNlcHFjcmV0bnhmaGpidmR1a2trIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA2MTc1NDcsImV4cCI6MjA2NjE5MzU0N30.H56IGRN14FpfHXQVODKsmTbqMEe27_gcCcgGLphEEOU';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  realtime: {
    params: {
      eventsPerSecond: 10, // facultatif, tu peux l’enlever si pas utile
    }
  }
});