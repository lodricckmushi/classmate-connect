import { useEffect, useCallback, useRef } from 'react';
import { getSettings, getUpcomingReminders, markReminderTriggered, getEvent, Reminder } from '@/lib/db';
import { speakWithFallback, playNotificationBeep, playReminderSound, humanizeReminderText } from '@/lib/audioFallback';

// Check if notifications are supported and permission granted
export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) {
    console.warn('Notifications not supported');
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  return false;
}

// Register service worker for background notifications
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) {
    console.warn('Service Worker not supported');
    return null;
  }

  try {
    // The PWA plugin handles the main SW, but we add our custom one
    const registration = await navigator.serviceWorker.ready;
    console.log('Service Worker ready for notifications');
    return registration;
  } catch (e) {
    console.warn('Service Worker registration failed:', e);
    return null;
  }
}

// Notify service worker about reminder changes
export function notifyServiceWorker(type: string, data?: any): void {
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({ type, ...data });
  }
}

// Check if speech synthesis is supported
export function isSpeechSupported(): boolean {
  return 'speechSynthesis' in window;
}

// Speak text using Web Speech API with fallback
export async function speakText(text: string, volume: number = 1, rate: number = 1): Promise<void> {
  return speakWithFallback(text, volume, rate);
}

// Play a notification sound
export function playNotificationSound(): void {
  playNotificationBeep(0.4);
}

// Show a browser notification (basic)
export async function showNotification(title: string, body: string, tag?: string): Promise<void> {
  const hasPermission = await requestNotificationPermission();
  if (!hasPermission) return;

  const notification = new Notification(title, {
    body,
    icon: '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    tag: tag || `classping-${Date.now()}`,
    requireInteraction: true,
  });

  notification.onclick = () => {
    window.focus();
    notification.close();
  };
}

// Show persistent notification that requires user action to dismiss
export async function showPersistentNotification(title: string, body: string, tag?: string): Promise<void> {
  const hasPermission = await requestNotificationPermission();
  if (!hasPermission) return;

  // Try to use service worker for persistent notification with actions
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    try {
      const registration = await navigator.serviceWorker.ready;
      await registration.showNotification(title, {
        body,
        icon: '/pwa-192x192.png',
        badge: '/pwa-192x192.png',
        tag: tag || `classping-${Date.now()}`,
        requireInteraction: true, // Won't dismiss until user clicks
        actions: [
          { action: 'ok', title: '✓ Got it!' },
          { action: 'snooze', title: '⏰ Snooze 5min' }
        ],
        data: { tag, timestamp: Date.now() }
      } as NotificationOptions);
      return;
    } catch (e) {
      console.warn('Service worker notification failed:', e);
    }
  }

  // Fallback to regular notification
  const notification = new Notification(title, {
    body,
    icon: '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    tag: tag || `classping-${Date.now()}`,
    requireInteraction: true,
  });

  notification.onclick = () => {
    window.focus();
    notification.close();
  };
}

// Trigger a reminder with notification and optional voice
export async function triggerReminder(reminder: Reminder): Promise<void> {
  const settings = await getSettings();
  const event = await getEvent(reminder.eventId);

  if (!event) {
    await markReminderTriggered(reminder.id, true);
    return;
  }

  // Generate human-friendly message
  const humanMessage = humanizeReminderText(
    event.title,
    reminder.minutesBefore,
    event.location
  );

  const notificationTitle = `📚 ${event.title}`;
  const notificationBody = humanMessage;

  // Play attention-grabbing sound
  playNotificationSound();

  // Show persistent notification (requires user to click OK to dismiss)
  if (settings.notificationsEnabled) {
    await showPersistentNotification(notificationTitle, notificationBody, reminder.id);
  }

  // Voice reminder with human-friendly message
  if (settings.voiceRemindersEnabled && event.voiceReminderEnabled) {
    try {
      await speakText(humanMessage, settings.voiceVolume, settings.voiceRate);
    } catch (e) {
      console.warn('Voice reminder failed, playing fallback sound:', e);
      await playReminderSound({ volume: settings.voiceVolume, urgency: 'high' });
    }
  }

  await markReminderTriggered(reminder.id);
}

// Check for due reminders
export async function checkReminders(): Promise<void> {
  const now = Date.now();
  const checkWindow = 60000; // Check reminders due in the next minute
  
  const dueReminders = await getUpcomingReminders(now - checkWindow, now + checkWindow);
  
  for (const reminder of dueReminders) {
    if (reminder.scheduledTime <= now && !reminder.triggered) {
      const isMissed = now - reminder.scheduledTime > 5 * 60 * 1000; // 5 min grace period
      
      if (isMissed) {
        await markReminderTriggered(reminder.id, true);
      } else {
        await triggerReminder(reminder);
      }
    }
  }
}

// Hook to run reminder checking
export function useReminderChecker(intervalMs: number = 30000): void {
  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const runCheck = useCallback(async () => {
    try {
      await checkReminders();
    } catch (e) {
      console.error('Reminder check failed:', e);
    }
  }, []);

  useEffect(() => {
    // Initial check
    runCheck();

    // Set up interval
    checkIntervalRef.current = setInterval(runCheck, intervalMs);

    // Also check when window regains focus (for mobile)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        runCheck();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [runCheck, intervalMs]);
}

// Calculate next reminder time for an event
export function calculateReminderTime(
  eventDayOfWeek: number,
  eventStartTime: string,
  minutesBefore: number
): number {
  const now = new Date();
  const currentDay = now.getDay();
  
  // Calculate days until the event
  let daysUntil = eventDayOfWeek - currentDay;
  if (daysUntil < 0) daysUntil += 7;
  
  // Parse event time
  const [hours, minutes] = eventStartTime.split(':').map(Number);
  
  // Create event date
  const eventDate = new Date(now);
  eventDate.setDate(eventDate.getDate() + daysUntil);
  eventDate.setHours(hours, minutes, 0, 0);
  
  // If event is today but already passed, schedule for next week
  if (daysUntil === 0 && eventDate.getTime() <= now.getTime()) {
    eventDate.setDate(eventDate.getDate() + 7);
  }
  
  // Subtract reminder time
  return eventDate.getTime() - (minutesBefore * 60 * 1000);
}

// Get readable time until reminder
export function getTimeUntilReminder(scheduledTime: number): string {
  const now = Date.now();
  const diff = scheduledTime - now;
  
  if (diff < 0) return 'Now';
  
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  return `${minutes}m`;
}
