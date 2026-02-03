// Custom Service Worker for ClassPing notifications
// This handles reminder notifications even when the app is closed

const REMINDER_CHECK_INTERVAL = 30000; // 30 seconds
const REMINDERS_STORE = 'classping-reminders';

// Store reminders in IndexedDB accessible by service worker
async function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('ClassPingDB', 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

async function getUpcomingReminders() {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['reminders'], 'readonly');
      const store = transaction.objectStore('reminders');
      const now = Date.now();
      const windowStart = now - 60000;
      const windowEnd = now + 60000;
      
      const index = store.index('scheduledTime');
      const range = IDBKeyRange.bound(windowStart, windowEnd);
      const request = index.getAll(range);
      
      request.onsuccess = () => {
        const reminders = request.result.filter(r => !r.triggered && !r.missed);
        resolve(reminders);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (e) {
    console.warn('SW: Could not access reminders:', e);
    return [];
  }
}

async function getEvent(eventId) {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['events'], 'readonly');
      const store = transaction.objectStore('events');
      const request = store.get(eventId);
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  } catch (e) {
    return null;
  }
}

async function markReminderTriggered(reminderId) {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['reminders'], 'readwrite');
      const store = transaction.objectStore('reminders');
      const request = store.get(reminderId);
      
      request.onsuccess = () => {
        const reminder = request.result;
        if (reminder) {
          reminder.triggered = true;
          store.put(reminder);
        }
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  } catch (e) {
    console.warn('SW: Could not mark reminder:', e);
  }
}

// Check for due reminders and show notifications
async function checkReminders() {
  const now = Date.now();
  const reminders = await getUpcomingReminders();
  
  for (const reminder of reminders) {
    if (reminder.scheduledTime <= now && !reminder.triggered) {
      const event = await getEvent(reminder.eventId);
      
      if (event) {
        const minutesText = reminder.minutesBefore === 1 
          ? '1 minute' 
          : `${reminder.minutesBefore} minutes`;
        
        // Show notification
        self.registration.showNotification(`📚 ${event.title}`, {
          body: `Starting in ${minutesText}${event.location ? ` at ${event.location}` : ''}`,
          icon: '/pwa-192x192.png',
          badge: '/pwa-192x192.png',
          tag: `reminder-${reminder.id}`,
          requireInteraction: true,
          vibrate: [200, 100, 200, 100, 200],
          actions: [
            { action: 'dismiss', title: 'Dismiss' },
            { action: 'view', title: 'View' }
          ],
          data: { eventId: event.id, reminderId: reminder.id }
        });
        
        await markReminderTriggered(reminder.id);
      }
    }
  }
}

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  if (event.action === 'view' || !event.action) {
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
        // Focus existing window or open new one
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            return client.focus();
          }
        }
        return clients.openWindow('/');
      })
    );
  }
});

// Periodic background sync for reminders (when supported)
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'check-reminders') {
    event.waitUntil(checkReminders());
  }
});

// Listen for messages from the main app
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'CHECK_REMINDERS') {
    event.waitUntil(checkReminders());
  }
  
  if (event.data && event.data.type === 'SCHEDULE_REMINDER') {
    // Store reminder data for background checking
    console.log('SW: Received reminder schedule request');
  }
});

// Set up periodic checking when SW activates
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // Try to register periodic sync (Chrome only, requires PWA install)
      if ('periodicSync' in self.registration) {
        try {
          await self.registration.periodicSync.register('check-reminders', {
            minInterval: REMINDER_CHECK_INTERVAL
          });
          console.log('SW: Periodic sync registered');
        } catch (e) {
          console.log('SW: Periodic sync not available, using interval');
        }
      }
      
      // Fallback: use setInterval for checking
      setInterval(checkReminders, REMINDER_CHECK_INTERVAL);
      
      // Initial check
      checkReminders();
    })()
  );
});
