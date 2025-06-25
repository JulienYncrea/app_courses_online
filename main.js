import { supabase } from './supabaseClient.js';

supabase
  .channel('films-inserts')
  .on(
    'postgres_changes',
    { event: 'INSERT', schema: 'public', table: 'films' },
    (payload) => {
      console.log('Nouveau film :', payload);
    }
  )
  .subscribe();
