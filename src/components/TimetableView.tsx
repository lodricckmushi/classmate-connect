import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Upload } from 'lucide-react';
import { useWeeklyEvents } from '@/hooks/useEvents';
import { EventCard } from '@/components/EventCard';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { ClassEvent } from '@/lib/db';
import { cn } from '@/lib/utils';

interface TimetableViewProps {
  onEditEvent: (event: ClassEvent) => void;
  onDeleteEvent: (id: string) => void;
  onUploadClick: () => void;
}

const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const fullDayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function TimetableView({ onEditEvent, onDeleteEvent, onUploadClick }: TimetableViewProps) {
  const { eventsByDay, loading } = useWeeklyEvents();
  const [selectedDay, setSelectedDay] = useState(new Date().getDay());

  const currentDayEvents = eventsByDay[selectedDay] || [];

  // Get week date range
  const today = new Date();
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay());
  
  const weekDates = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(startOfWeek);
    date.setDate(startOfWeek.getDate() + i);
    return date;
  });

  return (
    <div className="min-h-screen pb-24">
      <Header 
        title="Timetable"
        subtitle="Your weekly schedule"
      />

      <main className="px-4 py-4">
        {/* Upload button */}
        <Button
          onClick={onUploadClick}
          variant="outline"
          className="mb-4 w-full gap-2"
        >
          <Upload className="h-4 w-4" />
          Upload Timetable (PDF/Image)
        </Button>
        {/* Day selector */}
        <div className="mb-6 overflow-x-auto scrollbar-hide">
          <div className="flex gap-2">
            {weekDates.map((date, idx) => {
              const isToday = date.toDateString() === today.toDateString();
              const isSelected = idx === selectedDay;
              const hasEvents = (eventsByDay[idx] || []).length > 0;

              return (
                <motion.button
                  key={idx}
                  onClick={() => setSelectedDay(idx)}
                  className={cn(
                    'relative flex min-w-[60px] flex-col items-center rounded-2xl p-3 transition-colors',
                    isSelected
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-card text-foreground hover:bg-muted'
                  )}
                  whileTap={{ scale: 0.95 }}
                >
                  <span className="text-xs font-medium opacity-70">
                    {dayNames[idx]}
                  </span>
                  <span className={cn(
                    'mt-0.5 text-lg font-bold',
                    isToday && !isSelected && 'text-primary'
                  )}>
                    {date.getDate()}
                  </span>
                  
                  {/* Event indicator */}
                  {hasEvents && !isSelected && (
                    <div className="absolute bottom-1.5 h-1.5 w-1.5 rounded-full bg-primary" />
                  )}
                  
                  {/* Today indicator */}
                  {isToday && (
                    <div className={cn(
                      'absolute -top-1 -right-1 h-3 w-3 rounded-full',
                      isSelected ? 'bg-primary-foreground' : 'bg-primary'
                    )} />
                  )}
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Selected day header */}
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-foreground">
            {fullDayNames[selectedDay]}
          </h2>
          <span className="text-sm text-muted-foreground">
            {currentDayEvents.length} {currentDayEvents.length === 1 ? 'class' : 'classes'}
          </span>
        </div>

        {/* Events list */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : currentDayEvents.length === 0 ? (
          <motion.div
            className="mt-8 flex flex-col items-center justify-center text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            key={selectedDay}
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <Calendar className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="mt-4 text-base font-semibold text-foreground">
              No classes on {fullDayNames[selectedDay]}
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Tap the + button to add one
            </p>
          </motion.div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence mode="popLayout">
              {currentDayEvents.map((event, index) => (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
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
        )}

        {/* Weekly overview */}
        <section className="mt-8">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Week Overview
          </h3>
          <div className="grid grid-cols-7 gap-1">
            {dayNames.map((day, idx) => {
              const dayEventCount = (eventsByDay[idx] || []).length;
              const maxEvents = Math.max(
                ...Object.values(eventsByDay).map(e => e?.length || 0),
                1
              );
              const heightPercent = (dayEventCount / maxEvents) * 100;

              return (
                <div
                  key={day}
                  className="flex flex-col items-center"
                  onClick={() => setSelectedDay(idx)}
                >
                  <div className="flex h-16 w-full items-end justify-center rounded-lg bg-muted/50 p-1">
                    <motion.div
                      className={cn(
                        'w-full rounded-md transition-colors',
                        idx === selectedDay ? 'bg-primary' : 'bg-primary/40'
                      )}
                      initial={{ height: 0 }}
                      animate={{ height: `${Math.max(heightPercent, 5)}%` }}
                      transition={{ duration: 0.3, delay: idx * 0.05 }}
                    />
                  </div>
                  <span className="mt-1 text-[10px] text-muted-foreground">
                    {day}
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
}
