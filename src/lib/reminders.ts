import { useEffect, useCallback, useRef } from 'react';
import { getSettings, getUpcomingReminders, markReminderTriggered, getEvent, Reminder } from '@/lib/db';

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

// Check if speech synthesis is supported
export function isSpeechSupported(): boolean {
  return 'speechSynthesis' in window;
}

// Speak text using Web Speech API
export function speakText(text: string, volume: number = 1, rate: number = 1): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!isSpeechSupported()) {
      reject(new Error('Speech synthesis not supported'));
      return;
    }

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.volume = volume;
    utterance.rate = rate;
    utterance.pitch = 1;
    
    // Try to use a natural voice
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(v => 
      v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Google'))
    ) || voices.find(v => v.lang.startsWith('en'));
    
    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    utterance.onend = () => resolve();
    utterance.onerror = (e) => reject(e);

    window.speechSynthesis.speak(utterance);
  });
}

// Play a notification sound
export function playNotificationSound(): void {
  try {
    // Create a simple beep sound using Web Audio API
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = 800;
    oscillator.type = 'sine';
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);
  } catch (e) {
    console.warn('Could not play notification sound:', e);
  }
}

// Show a browser notification
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

// Trigger a reminder with notification and optional voice
export async function triggerReminder(reminder: Reminder): Promise<void> {
  const settings = await getSettings();
  const event = await getEvent(reminder.eventId);

  if (!event) {
    await markReminderTriggered(reminder.id, true);
    return;
  }

  const minutesText = reminder.minutesBefore === 1 
    ? '1 minute' 
    : `${reminder.minutesBefore} minutes`;

  const notificationTitle = `📚 ${event.title}`;
  const notificationBody = `Starting in ${minutesText}${event.location ? ` at ${event.location}` : ''}`;

  // Play sound
  playNotificationSound();

  // Show notification
  if (settings.notificationsEnabled) {
    await showNotification(notificationTitle, notificationBody, reminder.id);
  }

  // Voice reminder
  if (settings.voiceRemindersEnabled && event.voiceReminderEnabled) {
    const voiceText = `Reminder: ${event.title} starts in ${minutesText}${event.location ? ` at ${event.location}` : ''}`;
    try {
      await speakText(voiceText, settings.voiceVolume, settings.voiceRate);
    } catch (e) {
      console.warn('Voice reminder failed:', e);
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
