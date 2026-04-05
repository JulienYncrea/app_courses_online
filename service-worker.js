// 1. Configuration du Cache (Change la version pour forcer la mise à jour)
const CACHE_NAME = 'shopping-list-cache-v3';
const urlsToCache = [
  '/app_courses_online/',
  '/app_courses_online/index.html',
  '/app_courses_online/manifest.json',
  '/app_courses_online/icon.png',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css'
];

// 2. Installation : Mise en cache initiale et forçage de l'activation
self.addEventListener('install', (event) => {
  console.log('SW: Installation en cours...');
  self.skipWaiting(); // Force le nouveau SW à s'installer sans attendre
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('SW: Mise en cache des fichiers statiques');
      return cache.addAll(urlsToCache);
    })
  );
});

// 3. Activation : Nettoyage des anciens caches
self.addEventListener('activate', (event) => {
  console.log('SW: Activation en cours...');
  event.waitUntil(
    (async () => {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('SW: Suppression de l\'ancien cache', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
      // Permet au SW de prendre le contrôle des pages immédiatement
      return self.clients.claim();
    })()
  );
});

// 4. Stratégie de Fetch : Network First (Priorité au réseau)
// C'est ce qui règle ton problème de "vieille version"
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET' || event.request.url.includes('supabase.co')) {
    return; // Laisse la requête passer normalement sans toucher au cache
  }
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Si le réseau répond, on renvoie la réponse et on met à jour le cache
        const responseClone = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseClone);
        });
        return response;
      })
      .catch(() => {
        // Si le réseau échoue (mode avion/mauvaise co), on utilise le cache
        return caches.match(event.request);
      })
  );
});

// 5. Gestion des Notifications Push
self.addEventListener('push', (event) => {
  let data = {};
  if (event.data) {
    data = event.data.json();
  }

  console.log('Push event received:', data);

  const title = data.title || 'Nouvelle notification';
  const options = {
    body: data.body || 'Vous avez un nouveau message.',
    icon: '/app_courses_online/icon.png',
    badge: '/app_courses_online/badge.png', // Assure-toi que ce fichier existe
    data: {
      url: data.url || self.location.origin
    }
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// 6. Clic sur la Notification
self.addEventListener('notificationclick', (event) => {
  event.notification.close(); // Ferme la notification

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Si un onglet est déjà ouvert, on le focus, sinon on en ouvre un nouveau
      if (clientList.length > 0) {
        let client = clientList[0];
        for (let i = 0; i < clientList.length; i++) {
          if (clientList[i].focused) {
            client = clientList[i];
          }
        }
        return client.focus();
      }
      return clients.openWindow(event.notification.data.url);
    })
  );
});