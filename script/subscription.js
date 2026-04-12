async function subscribeUserToPush() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        alert('Les notifications push ne sont pas supportées par votre navigateur.');
        return;
    }

    try {
        const registration = await navigator.serviceWorker.ready;
        const VAPID_PUBLIC_KEY = "BHvMEhklZrgvkLnopsv7GlF-nm7e-OSTzur56Cu6twTpHWjHu6YdPuriz-2G6gppyFjjYQxlt2uihEXOUY0rdXs";
        const convertedVapidKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
        console.log('Attempting to subscribe user...');
        const subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: convertedVapidKey
        });

        console.log('New push subscription:', subscription);
        await saveSubscriptionToDatabase(subscription);
        
        alert('Abonnement aux notifications réussi !');

    } catch (error) {
        console.error('Failed to subscribe the user:', error);
        if (error.name === 'NotAllowedError') {
            alert('L\'autorisation de notification a été refusée. Veuillez l\'activer dans les paramètres de votre navigateur.');
        } else {
            alert('Erreur lors de l\'enregistrement de l\'abonnement : ' + (error.message || error.name));
        }
    }
}
function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
        .replace(/\-/g, '+')
        .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

function arrayBufferToBase64(buffer) {
    return btoa(String.fromCharCode.apply(null, new Uint8Array(buffer)))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
    }
// Fonction pour sauvegarder l'abonnement dans la base de données Supabase
async function saveSubscriptionToDatabase(subscription) {
    if (!currentListId) {
        console.error('No currentListId defined. Cannot save subscription.');
        alert('Veuillez charger ou créer une liste dans les paramètres avant de vous abonner aux notifications.');
        return;
    }

    // Récupérer p256dh et auth via getKey() et les convertir en Base64
    const p256dh = arrayBufferToBase64(subscription.getKey('p256dh'));
    const auth = arrayBufferToBase64(subscription.getKey('auth'));

    // Convertir l'objet de souscription complet en chaîne JSON
    const subscriptionJson = JSON.stringify(subscription);

    const { data, error } = await supabaseClient
        .from('subscriptions') // Assurez-vous que le nom de la table est correct ici
        .insert([
            {
                list_id: currentListId,
                endpoint: subscription.endpoint,
                p256dh: p256dh,
                auth: auth,
                subscription_json: subscriptionJson // <-- AJOUTEZ CETTE LIGNE
            }
        ])
        .select();

    if (error) {
        console.error('Error saving subscription:', error.message);
        alert('Erreur lors de l\'enregistrement de l\'abonnement : ' + error.message);
    } else {
        console.log('Subscription saved:', data);
    }
}

async function updateSubscriptionForNewList(newListId) {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (subscription) {
        // Extraire les clés de sécurité (format ArrayBuffer -> Base64)
        const p256dh = btoa(String.fromCharCode.apply(null, new Uint8Array(subscription.getKey('p256dh'))));
        const auth = btoa(String.fromCharCode.apply(null, new Uint8Array(subscription.getKey('auth'))));

        const { error } = await supabaseClient
            .from('subscriptions')
            .upsert({ 
                endpoint: subscription.endpoint, 
                list_id: newListId,
                p256dh: p256dh, // On ajoute la clé publique
                auth: auth,     // On ajoute le secret d'authentification
                subscription_json: JSON.stringify(subscription)
            }, { onConflict: 'endpoint' }); 

        if (error) console.error("Erreur de mise à jour d'abonnement:", error);
    } else {
    console.log("Aucun abonnement, lancement de subscribeUserToPush...");
    await subscribeUserToPush();
    }
}