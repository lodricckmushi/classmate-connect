import { motion } from 'framer-motion';
import { MapPin, Clock, Bell, BellOff, Trash2 } from 'lucide-react';
import { ClassEvent } from '@/lib/db';
import { cn } from '@/lib/utils';

interface EventCardProps {
  event: ClassEvent;
  onEdit?: (event: ClassEvent) => void;
  onDelete?: (id: string) => void;
  isCompact?: boolean;
  showDay?: boolean;
}

const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function EventCard({ event, onEdit, onDelete, isCompact, showDay }: EventCardProps) {
  const hasReminders = event.reminderMinutes.length > 0;

  return (
    <motion.div
      className={cn(
        'event-card relative overflow-hidden',
        isCompact ? 'p-3' : 'p-4'
      )}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      whileHover={{ scale: 1.02 }}
      onClick={() => onEdit?.(event)}
      style={{ cursor: onEdit ? 'pointer' : 'default' }}
    >
      {/* Color accent bar */}
      <div
        className="absolute left-0 top-0 h-full w-1 rounded-l-2xl"
        style={{ backgroundColor: event.color }}
      />

      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          {/* Title */}
          <h3 className={cn(
            'font-semibold text-foreground truncate',
            isCompact ? 'text-sm' : 'text-base'
          )}>
            {event.title}
          </h3>

          {/* Time and location */}
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              <span>{event.startTime} - {event.endTime}</span>
            </div>
            
            {showDay && (
              <span className="text-xs font-medium text-primary">
                {dayNames[event.dayOfWeek]}
              </span>
            )}
            
            {event.location && (
              <div className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                <span className="truncate max-w-[120px]">{event.location}</span>
              </div>
            )}
          </div>

          {/* Reminder badges */}
          {!isCompact && hasReminders && (
            <div className="mt-2 flex flex-wrap gap-1">
              {event.reminderMinutes.map((min) => (
                <span
                  key={min}
                  className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary"
                >
                  <Bell className="h-3 w-3" />
                  {min}m
                </span>
              ))}
              {event.voiceReminderEnabled && (
                <span className="inline-flex items-center gap-1 rounded-full bg-accent px-2 py-0.5 text-xs font-medium text-accent-foreground">
                  🔊 Voice
                </span>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col items-end gap-2">
          {!isCompact && (
            <div className="flex items-center gap-1">
              {hasReminders ? (
                <Bell className="h-4 w-4 text-primary" />
              ) : (
                <BellOff className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
          )}
          
          {onDelete && (
            <motion.button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(event.id);
              }}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
              whileTap={{ scale: 0.9 }}
            >
              <Trash2 className="h-4 w-4" />
            </motion.button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
