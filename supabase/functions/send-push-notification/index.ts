// supabase/functions/send-push-notification/index.ts
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import webpush from 'https://esm.sh/web-push@3.6.7'; // Utilisez une version stable

// Remplacez par vos clés VAPID
const VAPID_PUBLIC_KEY = Deno.env.get('BC-_2wv1Kjqb8G575LuS7iuvgBSPrUqE7MIo-8aY8ro9CqMBVMMvJU0na3CAyO-EjJEnNG4nAiBxphlNcik_YYo');
const VAPID_PRIVATE_KEY = Deno.env.get('a3avPuBdV1kAGIbYL4MSivoAbrvyEAbVD9s_dxpDm3w');
const VAPID_SUBJECT = 'mailto: <julien.minviel@gmail.com>'; // Remplacez par votre email

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

serve(async (req) => {
    const supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '' // Utilisez la clé de rôle de service
    );

    if (req.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
            status: 405,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    const { list_id, message } = await req.json();

    if (!list_id || !message) {
        return new Response(JSON.stringify({ error: 'Missing list_id or message' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    try {
        // Récupérer toutes les souscriptions pour cette list_id
        const { data: subscriptions, error } = await supabaseClient
            .from('push_subscriptions')
            .select('endpoint, p256dh, auth')
            .eq('list_id', list_id);

        if (error) {
            console.error('Error fetching subscriptions:', error);
            return new Response(JSON.stringify({ error: 'Failed to fetch subscriptions' }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        const payload = JSON.stringify({
            title: 'Nouveau message pour votre liste de courses',
            body: message,
            url: `${req.headers.get('origin')}` // Ou l'URL de votre PWA
        });

        const sendPromises = subscriptions.map(sub => {
            const pushSubscription = {
                endpoint: sub.endpoint,
                keys: {
                    p256dh: sub.p256dh,
                    auth: sub.auth,
                },
            };
            return webpush.sendNotification(pushSubscription, payload)
                .catch(e => {
                    console.error('Failed to send push notification to subscription:', sub.endpoint, e);
                    // Gérer les abonnements expirés (ex: les supprimer de la DB)
                    if (e.statusCode === 410 || e.statusCode === 404) { // Gone or Not Found
                        console.log('Subscription expired, deleting from DB:', sub.endpoint);
                        return supabaseClient.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
                    }
                    return Promise.resolve(); // Ne pas bloquer si une seule notif échoue
                });
        });

        await Promise.allSettled(sendPromises); // Attendre que toutes les notifications soient tentées

        return new Response(JSON.stringify({ success: true, sentTo: subscriptions.length }), {
            headers: { 'Content-Type': 'application/json' },
        });
    } catch (error) {
        console.error('Unexpected error:', error);
        return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
});