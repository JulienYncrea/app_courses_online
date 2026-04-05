import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import webpush from 'https://esm.sh/web-push@3.6.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  console.log("--- NOUVELLE REQUÊTE REÇUE ---");

  try {
    const body = await req.json();
    const { listId, message } = body;
    
    console.log("1. Payload reçu du client :", JSON.stringify(body));
    console.log("   - listId recherché :", `[${listId}]`);

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // DEBUG : On regarde d'abord TOUT ce qu'il y a dans la table pour comparer les IDs
    const { data: debugAll } = await supabaseClient.from('subscriptions').select('list_id');
    console.log("2. Debug Base de données :");
    console.log("   - IDs actuellement en base :", debugAll?.map(d => `[${d.list_id}]`));

    // 1. Récupération des abonnements filtrés
    const { data: subscriptions, error: dbError } = await supabaseClient
      .from('subscriptions')
      .select('subscription_json')
      .eq('list_id', listId);

    if (dbError) {
      console.error("3. Erreur SQL :", dbError.message);
      throw new Error(`Erreur DB: ${dbError.message}`);
    }

    console.log(`4. Résultat du filtre : ${subscriptions?.length || 0} abonné(s) trouvé(s).`);

    if (!subscriptions || subscriptions.length === 0) {
      console.log("   -> Aucun match. Vérifiez si list_id est bien un UUID en base.");
      return new Response(JSON.stringify({ sent: 0, message: 'No subs found' }), {
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
      console.error("5. Erreur : Clés VAPID manquantes dans les Secrets.");
      throw new Error('Clés VAPID manquantes');
    }

    webpush.setVapidDetails(VAPID_KEYS.subject, VAPID_KEYS.publicKey, VAPID_KEYS.privateKey);

    // 3. Envoi des notifications
    console.log("6. Début de l'envoi push...");
    const results = await Promise.all(
      subscriptions.map(async (sub, index) => {
        try {
          const subscription = typeof sub.subscription_json === 'string' 
            ? JSON.parse(sub.subscription_json) 
            : sub.subscription_json;

          console.log(`   - Envoi au sub #${index} (Endpoint: ${subscription.endpoint?.substring(0, 30)}...)`);

          await webpush.sendNotification(
            subscription,
            JSON.stringify({ title: 'Shopping List', body: message })
          );
          return { success: true };
        } catch (e) {
          console.error(`   - Échec envoi sub #${index} :`, e.message);
          return { success: false };
        }
      })
    );

    const successCount = results.filter(r => r.success).length;
    console.log(`7. Fin de traitement. Succès : ${successCount}`);

    return new Response(JSON.stringify({ sent: successCount }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('CRASH GLOBAL FONCTION:', error.message);
    return new Response(JSON.stringify({ error: error.message, sent: 0 }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});