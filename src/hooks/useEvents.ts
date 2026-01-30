import { useState, useEffect } from 'react';
import { getAllEvents, getEventsByDay, ClassEvent } from '@/lib/db';

export function useEvents() {
  const [events, setEvents] = useState<ClassEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadEvents = async () => {
    try {
      setLoading(true);
      const allEvents = await getAllEvents();
      setEvents(allEvents);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e : new Error('Failed to load events'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
  }, []);

  return { events, loading, error, refresh: loadEvents };
}

export function useEventsByDay(dayOfWeek: number) {
  const [events, setEvents] = useState<ClassEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const dayEvents = await getEventsByDay(dayOfWeek);
      // Sort by start time
      dayEvents.sort((a, b) => a.startTime.localeCompare(b.startTime));
      setEvents(dayEvents);
      setLoading(false);
    };
    load();
  }, [dayOfWeek]);

  return { events, loading };
}

export function useTodayEvents() {
  const today = new Date().getDay();
  return useEventsByDay(today);
}

// Get events grouped by day for weekly view
export function useWeeklyEvents() {
  const { events, loading, refresh } = useEvents();
  
  const eventsByDay = events.reduce((acc, event) => {
    if (!acc[event.dayOfWeek]) {
      acc[event.dayOfWeek] = [];
    }
    acc[event.dayOfWeek].push(event);
    return acc;
  }, {} as Record<number, ClassEvent[]>);

  // Sort events within each day
  Object.keys(eventsByDay).forEach(day => {
    eventsByDay[Number(day)].sort((a, b) => a.startTime.localeCompare(b.startTime));
  });

  return { eventsByDay, loading, refresh };
}
