import { openDB, DBSchema, IDBPDatabase } from 'idb';

// Event types
export interface ClassEvent {
  id: string;
  title: string;
  location?: string;
  dayOfWeek: number; // 0 = Sunday, 1 = Monday, etc.
  startTime: string; // HH:mm format
  endTime: string;   // HH:mm format
  color: string;
  reminderMinutes: number[]; // e.g., [10, 30] for 10 and 30 min before
  voiceReminderEnabled: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface Reminder {
  id: string;
  eventId: string;
  scheduledTime: number; // Unix timestamp
  minutesBefore: number;
  triggered: boolean;
  missed: boolean;
}

export interface AppSettings {
  id: string;
  notificationsEnabled: boolean;
  voiceRemindersEnabled: boolean;
  defaultReminderMinutes: number[];
  voiceVolume: number;
  voiceRate: number;
  theme: 'light' | 'dark' | 'system';
  colorTheme: 'coral' | 'ocean' | 'forest' | 'violet' | 'sunset';
   onboardingCompleted: boolean;
   permissionAskedAt: number | null;
}

export interface WeeklySummary {
  id: string;
  weekStart: number; // Unix timestamp of week start
  totalEvents: number;
  missedReminders: number;
  onTimeReminders: number;
  generatedAt: number;
}

// Database schema
interface ClassPingDB extends DBSchema {
  events: {
    key: string;
    value: ClassEvent;
    indexes: { 'by-day': number };
  };
  reminders: {
    key: string;
    value: Reminder;
    indexes: { 
      'by-event': string;
      'by-scheduled': number;
      'by-triggered': string; // compound: triggered + scheduledTime
    };
  };
  settings: {
    key: string;
    value: AppSettings;
  };
  summaries: {
    key: string;
    value: WeeklySummary;
    indexes: { 'by-week': number };
  };
}

const DB_NAME = 'classping-db';
const DB_VERSION = 1;

let dbInstance: IDBPDatabase<ClassPingDB> | null = null;

export async function getDB(): Promise<IDBPDatabase<ClassPingDB>> {
  if (dbInstance) return dbInstance;

  dbInstance = await openDB<ClassPingDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Events store
      if (!db.objectStoreNames.contains('events')) {
        const eventStore = db.createObjectStore('events', { keyPath: 'id' });
        eventStore.createIndex('by-day', 'dayOfWeek');
      }

      // Reminders store
      if (!db.objectStoreNames.contains('reminders')) {
        const reminderStore = db.createObjectStore('reminders', { keyPath: 'id' });
        reminderStore.createIndex('by-event', 'eventId');
        reminderStore.createIndex('by-scheduled', 'scheduledTime');
      }

      // Settings store
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'id' });
      }

      // Summaries store
      if (!db.objectStoreNames.contains('summaries')) {
        const summaryStore = db.createObjectStore('summaries', { keyPath: 'id' });
        summaryStore.createIndex('by-week', 'weekStart');
      }
    },
  });

  return dbInstance;
}

// Generate unique ID
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Event CRUD operations
export async function addEvent(event: Omit<ClassEvent, 'id' | 'createdAt' | 'updatedAt'>): Promise<ClassEvent> {
  const db = await getDB();
  const now = Date.now();
  const newEvent: ClassEvent = {
    ...event,
    id: generateId(),
    createdAt: now,
    updatedAt: now,
  };
  await db.put('events', newEvent);
  return newEvent;
}

export async function updateEvent(id: string, updates: Partial<ClassEvent>): Promise<ClassEvent | null> {
  const db = await getDB();
  const existing = await db.get('events', id);
  if (!existing) return null;

  const updated: ClassEvent = {
    ...existing,
    ...updates,
    id,
    updatedAt: Date.now(),
  };
  await db.put('events', updated);
  return updated;
}

export async function deleteEvent(id: string): Promise<boolean> {
  const db = await getDB();
  const existing = await db.get('events', id);
  if (!existing) return false;

  await db.delete('events', id);
  
  // Also delete related reminders
  const reminders = await db.getAllFromIndex('reminders', 'by-event', id);
  for (const reminder of reminders) {
    await db.delete('reminders', reminder.id);
  }
  
  return true;
}

export async function getEvent(id: string): Promise<ClassEvent | undefined> {
  const db = await getDB();
  return db.get('events', id);
}

export async function getAllEvents(): Promise<ClassEvent[]> {
  const db = await getDB();
  return db.getAll('events');
}

export async function getEventsByDay(dayOfWeek: number): Promise<ClassEvent[]> {
  const db = await getDB();
  return db.getAllFromIndex('events', 'by-day', dayOfWeek);
}

// Reminder operations
export async function addReminder(reminder: Omit<Reminder, 'id'>): Promise<Reminder> {
  const db = await getDB();
  const newReminder: Reminder = {
    ...reminder,
    id: generateId(),
  };
  await db.put('reminders', newReminder);
  return newReminder;
}

export async function updateReminder(id: string, updates: Partial<Reminder>): Promise<Reminder | null> {
  const db = await getDB();
  const existing = await db.get('reminders', id);
  if (!existing) return null;

  const updated: Reminder = {
    ...existing,
    ...updates,
    id,
  };
  await db.put('reminders', updated);
  return updated;
}

export async function getUpcomingReminders(fromTime: number, toTime: number): Promise<Reminder[]> {
  const db = await getDB();
  const allReminders = await db.getAllFromIndex('reminders', 'by-scheduled');
  return allReminders.filter(
    r => !r.triggered && r.scheduledTime >= fromTime && r.scheduledTime <= toTime
  );
}

export async function getUntriggeredReminders(): Promise<Reminder[]> {
  const db = await getDB();
  const allReminders = await db.getAll('reminders');
  return allReminders.filter(r => !r.triggered);
}

export async function markReminderTriggered(id: string, missed: boolean = false): Promise<void> {
  const db = await getDB();
  const reminder = await db.get('reminders', id);
  if (reminder) {
    await db.put('reminders', { ...reminder, triggered: true, missed });
  }
}

export async function getRemindersByEvent(eventId: string): Promise<Reminder[]> {
  const db = await getDB();
  return db.getAllFromIndex('reminders', 'by-event', eventId);
}

export async function deleteRemindersByEvent(eventId: string): Promise<void> {
  const db = await getDB();
  const reminders = await db.getAllFromIndex('reminders', 'by-event', eventId);
  for (const reminder of reminders) {
    await db.delete('reminders', reminder.id);
  }
}

// Settings operations
const DEFAULT_SETTINGS: AppSettings = {
  id: 'app-settings',
  notificationsEnabled: true,
  voiceRemindersEnabled: true,
  defaultReminderMinutes: [10, 30],
  voiceVolume: 1,
  voiceRate: 1,
  theme: 'system',
  colorTheme: 'coral',
   onboardingCompleted: false,
   permissionAskedAt: null,
};

export async function getSettings(): Promise<AppSettings> {
  const db = await getDB();
  const settings = await db.get('settings', 'app-settings');
  return settings || DEFAULT_SETTINGS;
}

export async function updateSettings(updates: Partial<AppSettings>): Promise<AppSettings> {
  const db = await getDB();
  const current = await getSettings();
  const updated: AppSettings = {
    ...current,
    ...updates,
    id: 'app-settings',
  };
  await db.put('settings', updated);
  return updated;
}

// Weekly summary operations
export async function addWeeklySummary(summary: Omit<WeeklySummary, 'id' | 'generatedAt'>): Promise<WeeklySummary> {
  const db = await getDB();
  const newSummary: WeeklySummary = {
    ...summary,
    id: generateId(),
    generatedAt: Date.now(),
  };
  await db.put('summaries', newSummary);
  return newSummary;
}

export async function getLatestSummary(): Promise<WeeklySummary | undefined> {
  const db = await getDB();
  const all = await db.getAll('summaries');
  if (all.length === 0) return undefined;
  return all.sort((a, b) => b.generatedAt - a.generatedAt)[0];
}

// Utility: Clear all data (for testing/reset)
export async function clearAllData(): Promise<void> {
  const db = await getDB();
  await db.clear('events');
  await db.clear('reminders');
  await db.clear('summaries');
}
