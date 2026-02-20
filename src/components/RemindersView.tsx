import { motion, AnimatePresence } from 'framer-motion';
import { Bell, BellOff, Clock, AlertCircle, Zap } from 'lucide-react';
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
    const load = async () => {
      setLoading(true);
      const raw = await getUntriggeredReminders();
      const enriched = await Promise.all(
        raw.map(async (r) => ({ ...r, event: await getEvent(r.eventId) }))
      );
      enriched.sort((a, b) => a.scheduledTime - b.scheduledTime);
      setReminders(enriched);
      setLoading(false);
    };

    load();
    const iv = setInterval(load, 60000);
    return () => clearInterval(iv);
  }, []);

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
  const dayAfter = new Date(tomorrow); dayAfter.setDate(dayAfter.getDate() + 1);

  const todayR = reminders.filter(r => new Date(r.scheduledTime) >= today && new Date(r.scheduledTime) < tomorrow);
  const tomorrowR = reminders.filter(r => new Date(r.scheduledTime) >= tomorrow && new Date(r.scheduledTime) < dayAfter);
  const laterR = reminders.filter(r => new Date(r.scheduledTime) >= dayAfter);

  return (
    <div className="min-h-screen pb-28">
      <Header title="Reminders" subtitle="Your upcoming alerts" />

      <main className="px-4 py-3">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-7 w-7 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : reminders.length === 0 ? (
          <motion.div
            className="mt-12 flex flex-col items-center text-center gap-3"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
              <BellOff className="h-7 w-7 text-muted-foreground" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-foreground">No reminders set</h3>
              <p className="mt-0.5 text-sm text-muted-foreground">Add classes to get smart alerts</p>
            </div>
          </motion.div>
        ) : (
          <AnimatePresence>
            <ReminderGroup title="Today" reminders={todayR} icon={Zap} />
            <ReminderGroup title="Tomorrow" reminders={tomorrowR} icon={Clock} />
            <ReminderGroup title="Later" reminders={laterR} icon={AlertCircle} />
          </AnimatePresence>
        )}
      </main>
    </div>
  );
}

function ReminderGroup({
  title, reminders, icon: Icon,
}: { title: string; reminders: ReminderWithEvent[]; icon: typeof Bell }) {
  if (reminders.length === 0) return null;
  return (
    <section className="mb-5">
      <div className="mb-2 flex items-center gap-2">
        <Icon className="h-3.5 w-3.5 text-primary" />
        <h2 className="text-xs font-bold uppercase tracking-widest text-primary">{title}</h2>
        <div className="flex h-4 w-4 items-center justify-center rounded-full bg-primary/10">
          <span className="text-[9px] font-bold text-primary">{reminders.length}</span>
        </div>
      </div>
      <div className="space-y-2">
        {reminders.map((r, i) => (
          <ReminderCard key={r.id} reminder={r} index={i} />
        ))}
      </div>
    </section>
  );
}

function ReminderCard({ reminder, index }: { reminder: ReminderWithEvent; index: number }) {
  const isPast = reminder.scheduledTime < Date.now();
  const isHot = !isPast && reminder.scheduledTime - Date.now() < 30 * 60 * 1000;
  const timeStr = new Date(reminder.scheduledTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <motion.div
      className={cn(
        'relative rounded-2xl bg-card border overflow-hidden',
        isHot ? 'border-primary/30' : 'border-border/40',
      )}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
    >
      {/* Color accent bar */}
      {reminder.event?.color && (
        <div
          className="absolute left-0 top-0 bottom-0 w-1"
          style={{ backgroundColor: reminder.event.color }}
        />
      )}

      <div className="flex items-center gap-3 px-3.5 py-3 pl-4">
        {/* Icon */}
        <div className={cn(
          'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl',
          isPast ? 'bg-muted' : isHot ? 'bg-primary/10' : 'bg-accent'
        )}>
          <Bell className={cn(
            'h-4 w-4',
            isPast ? 'text-muted-foreground' : isHot ? 'text-primary' : 'text-accent-foreground'
          )} />
          {isHot && (
            <motion.div
              className="absolute h-9 w-9 rounded-xl border-2 border-primary/30"
              animate={{ scale: [1, 1.15, 1], opacity: [1, 0, 1] }}
              transition={{ repeat: Infinity, duration: 2 }}
            />
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">
            {reminder.event?.title || 'Unknown Class'}
          </p>
          <div className="mt-0.5 flex items-center gap-2 flex-wrap">
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              {timeStr}
            </span>
            <span className="text-xs text-muted-foreground">·</span>
            <span className="text-xs text-muted-foreground">{reminder.minutesBefore} min early</span>
          </div>
        </div>

        {/* Countdown */}
        {!isPast && (
          <span className={cn(
            'shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold',
            isHot ? 'bg-primary text-primary-foreground' : 'bg-primary/10 text-primary'
          )}>
            {getTimeUntilReminder(reminder.scheduledTime)}
          </span>
        )}
      </div>
    </motion.div>
  );
}
