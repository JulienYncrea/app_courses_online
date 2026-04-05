import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import webpush from 'https://esm.sh/web-push@3.6.7'; // Import standard plus stable

const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // Plus flexible pour le debug
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { listId, message } = await req.json();

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 1. Récupération des abonnements
    const { data: subscriptions, error: dbError } = await supabaseClient
      .from('subscriptions')
      .select('subscription_json')
      .eq('list_id', listId);

    if (dbError) throw new Error(`Erreur DB: ${dbError.message}`);

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(JSON.stringify({ message: 'No subs' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // 2. Configuration VAPID
    const VAPID_KEYS = {
      subject: 'mailto:julien.minviel@gmail.com',
      publicKey: Deno.env.get('VAPID_PUBLIC_KEY')!,
      privateKey: Deno.env.get('VAPID_PRIVATE_KEY')!,
    };

    if (!VAPID_KEYS.publicKey || !VAPID_KEYS.privateKey) {
      throw new Error('Clés VAPID manquantes dans les secrets Supabase');
    }

    webpush.setVapidDetails(VAPID_KEYS.subject, VAPID_KEYS.publicKey, VAPID_KEYS.privateKey);

    // 3. Envoi des notifications
    const results = await Promise.all(
      subscriptions.map(async (sub) => {
        try {
          // PROTECTION : On ne parse que si c'est une string
          const subscription = typeof sub.subscription_json === 'string' 
            ? JSON.parse(sub.subscription_json) 
            : sub.subscription_json;

          await webpush.sendNotification(
            subscription,
            JSON.stringify({ title: 'Shopping List', body: message })
          );
          return { success: true };
        } catch (e) {
          console.error('Erreur envoi unité:', e.message);
          return { success: false };
        }
      })
    );

    const successCount = results.filter(r => r.success).length;

    return new Response(JSON.stringify({ sent: successCount }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('CRASH FONCTION:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500, // On renvoie 500 pour les vraies erreurs serveur
    });
  }
});