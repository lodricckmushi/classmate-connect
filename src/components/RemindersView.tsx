import { motion, AnimatePresence } from 'framer-motion';
import { Bell, BellOff, Clock, AlertCircle, CheckCircle } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Header } from '@/components/Header';
import { getUntriggeredReminders, Reminder, getEvent, ClassEvent } from '@/lib/db';
import { getTimeUntilReminder } from '@/lib/reminders';
import { cn } from '@/lib/utils';

interface ReminderWithEvent extends Reminder {
  event?: ClassEvent;
}

export function RemindersView() {
  const [reminders, setReminders] = useState<ReminderWithEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadReminders = async () => {
      setLoading(true);
      const untriggered = await getUntriggeredReminders();
      
      // Fetch event details for each reminder
      const remindersWithEvents = await Promise.all(
        untriggered.map(async (reminder) => {
          const event = await getEvent(reminder.eventId);
          return { ...reminder, event };
        })
      );

      // Sort by scheduled time
      remindersWithEvents.sort((a, b) => a.scheduledTime - b.scheduledTime);
      
      setReminders(remindersWithEvents);
      setLoading(false);
    };

    loadReminders();
    
    // Refresh every minute
    const interval = setInterval(loadReminders, 60000);
    return () => clearInterval(interval);
  }, []);

  // Group reminders by day
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const thisWeek = new Date(today);
  thisWeek.setDate(thisWeek.getDate() + 7);

  const todayReminders = reminders.filter(r => {
    const date = new Date(r.scheduledTime);
    return date >= today && date < tomorrow;
  });

  const tomorrowReminders = reminders.filter(r => {
    const date = new Date(r.scheduledTime);
    const nextDay = new Date(tomorrow);
    nextDay.setDate(nextDay.getDate() + 1);
    return date >= tomorrow && date < nextDay;
  });

  const laterReminders = reminders.filter(r => {
    const date = new Date(r.scheduledTime);
    const dayAfterTomorrow = new Date(tomorrow);
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);
    return date >= dayAfterTomorrow;
  });

  const ReminderItem = ({ reminder }: { reminder: ReminderWithEvent }) => {
    const isPast = reminder.scheduledTime < Date.now();
    const isUpcoming = reminder.scheduledTime - Date.now() < 30 * 60 * 1000; // Within 30 mins

    return (
      <motion.div
        className={cn(
          'rounded-2xl bg-card p-4 shadow-card',
          isUpcoming && !isPast && 'ring-2 ring-primary/20'
        )}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-start gap-3">
          <div
            className={cn(
              'mt-0.5 flex h-10 w-10 items-center justify-center rounded-full',
              isPast ? 'bg-muted' : isUpcoming ? 'bg-primary/10 reminder-pulse' : 'bg-accent'
            )}
          >
            <Bell
              className={cn(
                'h-5 w-5',
                isPast ? 'text-muted-foreground' : isUpcoming ? 'text-primary' : 'text-accent-foreground'
              )}
            />
          </div>
          
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-foreground truncate">
              {reminder.event?.title || 'Unknown Event'}
            </h4>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {reminder.minutesBefore} min before class
            </p>
            
            <div className="mt-2 flex items-center gap-2">
              <Clock className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">
                {new Date(reminder.scheduledTime).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
              {!isPast && (
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                  in {getTimeUntilReminder(reminder.scheduledTime)}
                </span>
              )}
            </div>
          </div>

          {reminder.event && (
            <div
              className="h-8 w-1 rounded-full"
              style={{ backgroundColor: reminder.event.color }}
            />
          )}
        </div>
      </motion.div>
    );
  };

  const ReminderSection = ({ title, reminders, icon: Icon }: { 
    title: string; 
    reminders: ReminderWithEvent[];
    icon: typeof Bell;
  }) => {
    if (reminders.length === 0) return null;

    return (
      <section className="mb-6">
        <div className="mb-3 flex items-center gap-2">
          <Icon className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold uppercase tracking-wide text-primary">
            {title}
          </h2>
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
            {reminders.length}
          </span>
        </div>
        <div className="space-y-3">
          {reminders.map((reminder) => (
            <ReminderItem key={reminder.id} reminder={reminder} />
          ))}
        </div>
      </section>
    );
  };

  return (
    <div className="min-h-screen pb-24">
      <Header 
        title="Reminders"
        subtitle="Upcoming notifications"
      />

      <main className="px-4 py-4">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : reminders.length === 0 ? (
          <motion.div
            className="mt-8 flex flex-col items-center justify-center text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted">
              <BellOff className="h-10 w-10 text-muted-foreground" />
            </div>
            <h3 className="mt-4 text-lg font-semibold text-foreground">
              No upcoming reminders
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Add classes with reminders to get notified
            </p>
          </motion.div>
        ) : (
          <AnimatePresence>
            <ReminderSection title="Today" reminders={todayReminders} icon={Bell} />
            <ReminderSection title="Tomorrow" reminders={tomorrowReminders} icon={Clock} />
            <ReminderSection title="Later this week" reminders={laterReminders} icon={AlertCircle} />
          </AnimatePresence>
        )}
      </main>
    </div>
  );
}
