import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Clock, Sparkles } from 'lucide-react';
import { useTodayEvents } from '@/hooks/useEvents';
import { EventCard } from '@/components/EventCard';
import { Header } from '@/components/Header';
import { ClassEvent } from '@/lib/db';

interface TodayViewProps {
  onEditEvent: (event: ClassEvent) => void;
  onDeleteEvent: (id: string) => void;
}

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
};

const formatDate = () => {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
};

export function TodayView({ onEditEvent, onDeleteEvent }: TodayViewProps) {
  const { events, loading } = useTodayEvents();

  // Find the next upcoming event
  const now = new Date();
  const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  
  const upcomingEvents = events.filter(e => e.startTime >= currentTime);
  const pastEvents = events.filter(e => e.endTime < currentTime);
  const currentEvents = events.filter(e => e.startTime <= currentTime && e.endTime >= currentTime);

  return (
    <div className="min-h-screen pb-24">
      <Header 
        title={getGreeting()} 
        subtitle={formatDate()}
      />

      <main className="px-4 py-4">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : events.length === 0 ? (
          <motion.div
            className="mt-8 flex flex-col items-center justify-center text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
              <Sparkles className="h-10 w-10 text-primary" />
            </div>
            <h3 className="mt-4 text-lg font-semibold text-foreground">
              No classes today!
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Enjoy your free time or add a class
            </p>
          </motion.div>
        ) : (
          <div className="space-y-6">
            {/* Current class */}
            {currentEvents.length > 0 && (
              <section>
                <div className="mb-3 flex items-center gap-2">
                  <div className="h-2 w-2 animate-pulse rounded-full bg-success" />
                  <h2 className="text-sm font-semibold uppercase tracking-wide text-success">
                    Happening Now
                  </h2>
                </div>
                <AnimatePresence>
                  {currentEvents.map((event) => (
                    <EventCard
                      key={event.id}
                      event={event}
                      onEdit={onEditEvent}
                      onDelete={onDeleteEvent}
                    />
                  ))}
                </AnimatePresence>
              </section>
            )}

            {/* Upcoming today */}
            {upcomingEvents.length > 0 && (
              <section>
                <div className="mb-3 flex items-center gap-2">
                  <Clock className="h-4 w-4 text-primary" />
                  <h2 className="text-sm font-semibold uppercase tracking-wide text-primary">
                    Up Next
                  </h2>
                </div>
                <div className="space-y-3">
                  <AnimatePresence>
                    {upcomingEvents.map((event, index) => (
                      <motion.div
                        key={event.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <EventCard
                          event={event}
                          onEdit={onEditEvent}
                          onDelete={onDeleteEvent}
                        />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </section>
            )}

            {/* Past events */}
            {pastEvents.length > 0 && (
              <section className="opacity-60">
                <div className="mb-3 flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    Earlier Today
                  </h2>
                </div>
                <div className="space-y-3">
                  <AnimatePresence>
                    {pastEvents.map((event) => (
                      <EventCard
                        key={event.id}
                        event={event}
                        onEdit={onEditEvent}
                        isCompact
                      />
                    ))}
                  </AnimatePresence>
                </div>
              </section>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
