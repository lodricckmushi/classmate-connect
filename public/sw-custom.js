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

// Generate human-friendly message
function humanizeReminderText(eventTitle, minutesBefore, location) {
  const greetings = [
    "Hey there! Just a quick heads up",
    "Hi! Friendly reminder",
    "Hello! Don't forget",
    "Quick reminder for you",
  ];
  const greeting = greetings[Math.floor(Math.random() * greetings.length)];
  
  let timePhrase;
  if (minutesBefore === 1) {
    timePhrase = "in just 1 minute";
  } else if (minutesBefore <= 5) {
    timePhrase = `in about ${minutesBefore} minutes`;
  } else if (minutesBefore === 10) {
    timePhrase = "in 10 minutes";
  } else if (minutesBefore === 15) {
    timePhrase = "in about 15 minutes";
  } else if (minutesBefore === 30) {
    timePhrase = "in half an hour";
  } else if (minutesBefore === 60) {
    timePhrase = "in about an hour";
  } else {
    timePhrase = `in ${minutesBefore} minutes`;
  }
  
  let message = `${greeting}! ${eventTitle} is starting ${timePhrase}`;
  
  if (location) {
    message += `. Head over to ${location}`;
  }
  
  message += ". You've got this!";
  
  return message;
}

// Check for due reminders and show notifications
async function checkReminders() {
  const now = Date.now();
  const reminders = await getUpcomingReminders();
  
  for (const reminder of reminders) {
    if (reminder.scheduledTime <= now && !reminder.triggered) {
      const event = await getEvent(reminder.eventId);
      
      if (event) {
        const humanMessage = humanizeReminderText(
          event.title,
          reminder.minutesBefore,
          event.location
        );
        
        // Show persistent notification with friendly actions
        self.registration.showNotification(`📚 ${event.title}`, {
          body: humanMessage,
          icon: '/pwa-192x192.png',
          badge: '/pwa-192x192.png',
          tag: `reminder-${reminder.id}`,
          requireInteraction: true, // Won't dismiss until user interacts
          vibrate: [200, 100, 200, 100, 300],
          actions: [
            { action: 'ok', title: '✓ Got it!' },
            { action: 'snooze', title: '⏰ Snooze 5min' }
          ],
          data: { 
            eventId: event.id, 
            reminderId: reminder.id,
            eventTitle: event.title,
            location: event.location
          }
        });
        
        await markReminderTriggered(reminder.id);
      }
    }
  }
}

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  const action = event.action;
  const data = event.notification.data || {};
  
  if (action === 'ok' || action === 'dismiss') {
    // User acknowledged - close notification
    event.notification.close();
  } else if (action === 'snooze') {
    // Snooze for 5 minutes - show another notification
    event.notification.close();
    event.waitUntil(
      (async () => {
        await new Promise(resolve => setTimeout(resolve, 5 * 60 * 1000));
        self.registration.showNotification(`⏰ Reminder: ${data.eventTitle || 'Your class'}`, {
          body: `This is your snoozed reminder. Time to go${data.location ? ` to ${data.location}` : ''}!`,
          icon: '/pwa-192x192.png',
          badge: '/pwa-192x192.png',
          tag: `snooze-${Date.now()}`,
          requireInteraction: true,
          vibrate: [300, 100, 300],
          actions: [
            { action: 'ok', title: '✓ Got it!' }
          ]
        });
      })()
    );
  } else {
    // Default click - open/focus app
    event.notification.close();
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
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
