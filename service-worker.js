self.addEventListener('push', (event) => {
    const data = event.data.json();
    console.log('Push event received:', data);

    const title = data.title || 'Nouvelle notification de la liste de courses';
    const options = {
        body: data.body,
        icon: 'icon.png', // Assurez-vous que l'icône existe
        badge: 'badge.png', // Optionnel, petite icône sur Android
        data: {
            url: data.url || self.location.origin // URL à ouvrir lors du clic sur la notification
        }
    };

    event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close(); // Ferme la notification après le clic

    event.waitUntil(
        clients.openWindow(event.notification.data.url) // Ouvre l'URL spécifiée
    );
});


const CACHE_NAME = 'shopping-list-cache-v2';
const urlsToCache = [
  '/app_courses_online/',        // Référence à la racine de ton projet
  '/app_courses_online/index.html',
  '/app_courses_online/manifest.json',
  '/app_courses_online/icon.png',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css' // URL externe
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Cache hit - return response
        if (response) {
          return response;
        }
        return fetch(event.request);
      })
  );
});

self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});