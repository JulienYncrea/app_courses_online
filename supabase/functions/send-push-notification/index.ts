import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  // Gérer les requêtes OPTIONS (pré-vérification CORS)
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204, // No Content
      headers: {
        'Access-Control-Allow-Origin': 'https://julienyncrea.github.io', // Ou '*' pour toutes les origines (moins sécurisé)
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        'Access-Control-Max-Age': '86400', // Cache le résultat de la pré-vérification pendant 24 heures
      },
    })
  }

  // En-têtes CORS pour les réponses réussies
  const corsHeaders = {
    'Access-Control-Allow-Origin': 'https://julienyncrea.github.io', // Ou '*'
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }

  try {
    const { listId, message } = await req.json()

    if (!listId || !message) {
      return new Response(
        JSON.stringify({ error: 'Missing listId or message in request body' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      )
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          persistSession: false,
        },
      },
    )

    // Récupérer toutes les souscriptions de notifications pour cette listId
    const { data: subscriptions, error: subscriptionsError } = await supabaseClient
      .from('subscriptions')
      .select('subscription_json')
      .eq('list_id', listId)

    if (subscriptionsError) {
      console.error('Error fetching subscriptions:', subscriptionsError)
      return new Response(JSON.stringify({ error: 'Error fetching subscriptions' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      })
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log(`No subscriptions found for list: ${listId}`)
      return new Response(JSON.stringify({ message: 'No subscriptions found for this list.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    // Préparer les données pour la notification
    const notificationPayload = {
      title: 'Shopping List Update',
      body: message, // Utilisation du message générique
      url: `https://julienyncrea.github.io/app_courses_online/`, // URL vers votre app
    }

    // Envoyer les notifications
    const webPush = await import('https://esm.sh/web-push@3.6.7')
    webPush.setVapidDetails(
      'mailto: <julien.minviel@gmail.com>', // Remplacez par votre email
      Deno.env.get('BC-_2wv1Kjqb8G575LuS7iuvgBSPrUqE7MIo-8aY8ro9CqMBVMMvJU0na3CAyO-EjJEnNG4nAiBxphlNcik_YYo'),
      Deno.env.get('a3avPuBdV1kAGIbYL4MSivoAbrvyEAbVD9s_dxpDm3w'),
    )

    let successCount = 0
    let failureCount = 0

    for (const sub of subscriptions) {
      try {
        const subscription = JSON.parse(sub.subscription_json)
        await webPush.sendNotification(subscription, JSON.stringify(notificationPayload))
        successCount++
      } catch (e) {
        console.error('Error sending push notification to a subscriber:', e)
        failureCount++
        // Si l'abonnement n'est plus valide, vous pouvez envisager de le supprimer de la base de données ici
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
    )
  } catch (error) {
    console.error('Unhandled error in Edge Function:', error.message)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})