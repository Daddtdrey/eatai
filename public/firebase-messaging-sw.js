importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

// 🔴 REPLACE WITH YOUR FIREBASE CONFIG
const firebaseConfig = {
  apiKey: "AIzaSyBm5DntiyXX5PCWnNsMybJIC9UetJvyrz8",
  authDomain: "eatai-production-70b82.firebaseapp.com",
  projectId: "eatai-production-70b82",
  storageBucket: "eatai-production-70b82.firebasestorage.app",
  messagingSenderId: "439773552354",
  appId: "1:439773552354:web:6d7e35fc4541a1708148bb"
};


firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

/**
 * 🟢 BACKGROUND HANDLER
 * Fixed to prevent Double Notifications
 */
messaging.onBackgroundMessage(function(payload) {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);

  // 1. Check if the app is currently OPEN and VISIBLE
  return self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
    const isAppVisible = windowClients.some(client => client.visibilityState === 'visible');

    if (isAppVisible) {
      // 🛑 App is open! Do NOT show a system notification. 
      // The React app (onMessage) will handle the Toast/Sound.
      console.log('App is visible. Suppressing background notification.');
      return;
    }

    // 2. If App is Closed/Hidden, we proceed.
    // 🛑 CRITICAL CHECK: Did Firebase already send a visible notification?
    // If you send via Firebase Console, it often handles the display automatically.
    // We only manually show it if we need to customize the icon/actions.
    
    const notificationTitle = payload.notification.title;
    const notificationOptions = {
      body: payload.notification.body,
      icon: '/pwa-192x192.png', // Custom Icon
      badge: '/pwa-192x192.png',
      vibrate: [200, 100, 200],
      tag: 'eatai-notification', // 🟢 TAGGING: Replaces old notifications with new ones instead of stacking
      renotify: true,
      data: {
        url: '/'
      }
    };

    return self.registration.showNotification(notificationTitle, notificationOptions);
  });
});

/**
 * 🟢 CLICK HANDLER
 * Focuses the app when notification is clicked
 */
self.addEventListener('notificationclick', function(event) {
  console.log('[firebase-messaging-sw.js] Notification clicked');
  event.notification.close();

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
      // If tab is open, focus it
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url.includes(self.registration.scope) && 'focus' in client) {
          return client.focus();
        }
      }
      // If not open, open a new window
      if (self.clients.openWindow) {
        return self.clients.openWindow('/');
      }
    })
  );
});