import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
// La ligne 'import webpush from ...' a été déplacée plus bas
// Ce console.log devrait s'afficher si la fonction démarre avant un crash majeur
console.log('--- Fonction Edge send-push-notification Démarrée ---');
serve(async (req)=>{
  // Gérer les requêtes OPTIONS (pré-vérification CORS)
  if (req.method === 'OPTIONS') {
    console.log('Requête OPTIONS reçue. Envoi de la réponse CORS 204.');
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': 'https://julienyncrea.github.io',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        'Access-Control-Max-Age': '86400'
      }
    });
  }
  // En-têtes CORS pour les réponses réussies (pour les requêtes POST réelles)
  const corsHeaders = {
    'Access-Control-Allow-Origin': 'https://julienyncrea.github.io',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
  };
  try {
    const { listId, message } = await req.json();
    if (!listId || !message) {
      console.error('Erreur: listId ou message manquant dans le corps de la requête.');
      return new Response(JSON.stringify({
        error: 'Missing listId or message in request body'
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 400
      });
    }
    const supabaseClient = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '', {
      auth: {
        persistSession: false
      }
    });
    const { data: subscriptions, error: subscriptionsError } = await supabaseClient.from('subscriptions') // Assurez-vous que le nom de votre table est 'subscriptions'
    .select('subscription_json').eq('list_id', listId);
    if (subscriptionsError) {
      console.error('Erreur lors de la récupération des souscriptions:', subscriptionsError);
      return new Response(JSON.stringify({
        error: 'Error fetching subscriptions'
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 500
      });
    }
    if (!subscriptions || subscriptions.length === 0) {
      console.log(`Aucune souscription trouvée pour la liste: ${listId}`);
      return new Response(JSON.stringify({
        message: 'No subscriptions found for this list.'
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 200
      });
    }
    const notificationPayload = {
      title: 'Shopping List Update',
      body: message,
      url: `https://julienyncrea.github.io/app_courses_online/`
    };
    // --- DÉPLACE L'IMPORTATION DE WEB-PUSH ICI, À L'INTÉRIEUR DU BLOC try ---
    // Cela garantit que web-push n'est importé qu'au moment d'une requête réelle,
    // ce qui peut aider si le crash se produit pendant le chargement initial du module.
    const webpush = await import('npm:web-push@3.6.7');
    const VAPID_SUBJECT_ENV = 'mailto:julien.minviel@gmail.com'; // Vous pouvez aussi en faire une variable d'environnement
    const VAPID_PUBLIC_KEY_ENV = Deno.env.get('VAPID_PUBLIC_KEY');
    const VAPID_PRIVATE_KEY_ENV = Deno.env.get('VAPID_PRIVATE_KEY');
    // *** CES LOGS SONT CRUCIAUX POUR VÉRIFIER LES VALEURS ***
    console.log('VAPID_PUBLIC_KEY_ENV (dans try):', VAPID_PUBLIC_KEY_ENV);
    console.log('VAPID_PRIVATE_KEY_ENV (dans try):', VAPID_PRIVATE_KEY_ENV ? '*** (présente)' : '*** (ABSENTE ou VIDE)');
    // Si la clé privée est très longue, évitez de l'afficher en entier pour la sécurité.
    if (!VAPID_PUBLIC_KEY_ENV || !VAPID_PRIVATE_KEY_ENV) {
      console.error('Erreur: VAPID_PUBLIC_KEY ou VAPID_PRIVATE_KEY manquante dans les variables d\'environnement.');
      return new Response(JSON.stringify({
        error: 'Server VAPID keys not configured. Check Edge Function environment variables.'
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 500
      });
    }
    webpush.setVapidDetails(VAPID_SUBJECT_ENV, VAPID_PUBLIC_KEY_ENV, VAPID_PRIVATE_KEY_ENV);
    let successCount = 0;
    let failureCount = 0;
    for (const sub of subscriptions){
      try {
        const subscription = JSON.parse(sub.subscription_json);
        await webpush.sendNotification(subscription, JSON.stringify(notificationPayload));
        successCount++;
      } catch (e) {
        console.error('Erreur lors de l\'envoi de la notification push à un abonné:', e);
        failureCount++;
      // Vous pourriez ajouter ici une logique pour supprimer les abonnements invalides de la DB
      }
    }
    return new Response(JSON.stringify({
      message: `Notifications sent: ${successCount} successful, ${failureCount} failed.`
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 200
    });
  } catch (error) {
    console.error('Erreur non gérée dans la fonction Edge:', error.message);
    // Log des détails complets de l'erreur pour un diagnostic approfondi
    console.error('Détails de l\'erreur non gérée:', error);
    return new Response(JSON.stringify({
      error: error.message
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 400
    });
  }
});
