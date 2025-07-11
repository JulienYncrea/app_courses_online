import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import webpush from 'https://esm.sh/web-push@3.6.7'; // Importez la bibliothèque web-push

serve(async (req) => {
  // Gérer les requêtes OPTIONS (pré-vérification CORS)
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204, // No Content
      headers: {
        'Access-Control-Allow-Origin': 'https://julienyncrea.github.io',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        'Access-Control-Max-Age': '86400', // Cache le résultat de la pré-vérification pendant 24 heures
      },
    });
  }

  // En-têtes CORS pour les réponses réussies
  const corsHeaders = {
    'Access-Control-Allow-Origin': 'https://julienyncrea.github.io',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };

  try {
    const { listId, message } = await req.json();

    if (!listId || !message) {
      return new Response(
        JSON.stringify({ error: 'Missing listId or message in request body' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          persistSession: false,
        },
      }
    );

    // Récupérer toutes les souscriptions de notifications pour cette listId
    // Utilisation de 'subscriptions' car le nom de la table a été renommé
    const { data: subscriptions, error: subscriptionsError } = await supabaseClient
      .from('subscriptions')
      .select('subscription_json')
      .eq('list_id', listId);

    if (subscriptionsError) {
      console.error('Error fetching subscriptions:', subscriptionsError);
      return new Response(JSON.stringify({ error: 'Error fetching subscriptions' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log(`No subscriptions found for list: ${listId}`);
      return new Response(JSON.stringify({ message: 'No subscriptions found for this list.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // Préparer les données pour la notification
    const notificationPayload = {
      title: 'Shopping List Update',
      body: message, // Utilisation du message générique
      url: `https://julienyncrea.github.io/app_courses_online/`, // URL vers votre app
    };

    // --- DÉBUT DES CORRECTIONS POUR LES CLÉS VAPID ---

    // Récupérer les clés VAPID depuis les variables d'environnement par leurs NOMS
    const VAPID_SUBJECT_ENV = 'mailto:julien.minviel@gmail.com'; // Votre sujet VAPID (peut aussi être une variable d'environnement)
    const VAPID_PUBLIC_KEY_ENV = Deno.env.get('VAPID_PUBLIC_KEY');
    const VAPID_PRIVATE_KEY_ENV = Deno.env.get('VAPID_PRIVATE_KEY');

    // Vérification que les variables d'environnement VAPID sont bien définies
    if (!VAPID_PUBLIC_KEY_ENV || !VAPID_PRIVATE_KEY_ENV) {
        console.error('Missing VAPID_PUBLIC_KEY or VAPID_PRIVATE_KEY environment variables.');
        return new Response(JSON.stringify({ error: 'Server VAPID keys not configured. Check Edge Function environment variables.' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500 // Internal Server Error car la configuration du serveur est incomplète
        });
    }

    // Configurer web-push avec les valeurs des variables d'environnement
    webpush.setVapidDetails(
        VAPID_SUBJECT_ENV,
        VAPID_PUBLIC_KEY_ENV,
        VAPID_PRIVATE_KEY_ENV
    );

    // --- FIN DES CORRECTIONS POUR LES CLÉS VAPID ---

    let successCount = 0;
    let failureCount = 0;

    for (const sub of subscriptions) {
      try {
        const subscription = JSON.parse(sub.subscription_json);
        await webpush.sendNotification(subscription, JSON.stringify(notificationPayload));
        successCount++;
      } catch (e) {
        console.error('Error sending push notification to a subscriber:', e);
        failureCount++;
        // Si l'abonnement n'est plus valide (e.g., NotRegistered), vous pouvez envisager de le supprimer de la base de données ici
        // if (e.statusCode === 410 || e.statusCode === 404) {
        //   console.log('Subscription expired or not found, deleting from DB.');
        //   await supabaseClient.from('subscriptions').delete().eq('endpoint', subscription.endpoint);
        // }
      }
    }

    return new Response(
      JSON.stringify({
        message: `Notifications sent: ${successCount} successful, ${failureCount} failed.`,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    );
  } catch (error) {
    console.error('Unhandled error in Edge Function:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});