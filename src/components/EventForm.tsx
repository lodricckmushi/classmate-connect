import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Minus, Volume2, VolumeX } from 'lucide-react';
import { ClassEvent, addEvent, updateEvent, generateId, addReminder, deleteRemindersByEvent } from '@/lib/db';
import { calculateReminderTime } from '@/lib/reminders';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';

interface EventFormProps {
  event?: ClassEvent;
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
}

const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const colorOptions = [
  '#e85d3b', // Primary coral
  '#3b82f6', // Blue
  '#22c55e', // Green
  '#f59e0b', // Amber
  '#8b5cf6', // Purple
  '#ec4899', // Pink
  '#06b6d4', // Cyan
  '#64748b', // Slate
];

const defaultReminderOptions = [5, 10, 15, 30, 60];

export function EventForm({ event, isOpen, onClose, onSave }: EventFormProps) {
  const [title, setTitle] = useState('');
  const [location, setLocation] = useState('');
  const [dayOfWeek, setDayOfWeek] = useState(1); // Monday
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [color, setColor] = useState(colorOptions[0]);
  const [reminderMinutes, setReminderMinutes] = useState<number[]>([10]);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [customReminder, setCustomReminder] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (event) {
      setTitle(event.title);
      setLocation(event.location || '');
      setDayOfWeek(event.dayOfWeek);
      setStartTime(event.startTime);
      setEndTime(event.endTime);
      setColor(event.color);
      setReminderMinutes(event.reminderMinutes);
      setVoiceEnabled(event.voiceReminderEnabled);
    } else {
      // Reset form with current time as default
      const now = new Date();
      const currentHour = now.getHours().toString().padStart(2, '0');
      const currentMinute = now.getMinutes().toString().padStart(2, '0');
      const currentTime = `${currentHour}:${currentMinute}`;
      
      // End time is 1 hour from now
      const endHour = ((now.getHours() + 1) % 24).toString().padStart(2, '0');
      const endTimeValue = `${endHour}:${currentMinute}`;
      
      setTitle('');
      setLocation('');
      setDayOfWeek(now.getDay() || 1);
      setStartTime(currentTime);
      setEndTime(endTimeValue);
      setColor(colorOptions[0]);
      setReminderMinutes([10]);
      setVoiceEnabled(true);
    }
  }, [event, isOpen]);

  const toggleReminder = (minutes: number) => {
    setReminderMinutes(prev =>
      prev.includes(minutes)
        ? prev.filter(m => m !== minutes)
        : [...prev, minutes].sort((a, b) => a - b)
    );
  };

  const addCustomReminder = () => {
    const mins = parseInt(customReminder);
    if (mins > 0 && !reminderMinutes.includes(mins)) {
      setReminderMinutes(prev => [...prev, mins].sort((a, b) => a - b));
      setCustomReminder('');
    }
  };

  const handleSave = async () => {
    if (!title.trim()) return;

    setSaving(true);
    try {
      const eventData = {
        title: title.trim(),
        location: location.trim() || undefined,
        dayOfWeek,
        startTime,
        endTime,
        color,
        reminderMinutes,
        voiceReminderEnabled: voiceEnabled,
      };

      let savedEvent: ClassEvent;

      if (event) {
        // Update existing
        await deleteRemindersByEvent(event.id);
        const updated = await updateEvent(event.id, eventData);
        if (!updated) throw new Error('Failed to update event');
        savedEvent = updated;
      } else {
        // Create new
        savedEvent = await addEvent(eventData);
      }

      // Create reminders for each reminder time
      for (const mins of reminderMinutes) {
        const scheduledTime = calculateReminderTime(
          savedEvent.dayOfWeek,
          savedEvent.startTime,
          mins
        );
        
        await addReminder({
          eventId: savedEvent.id,
          scheduledTime,
          minutesBefore: mins,
          triggered: false,
          missed: false,
        });
      }

      onSave();
      onClose();
    } catch (e) {
      console.error('Save failed:', e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-50 bg-foreground/20 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Form modal */}
          <motion.div
            className="fixed inset-x-4 bottom-4 top-auto z-50 max-h-[85vh] overflow-y-auto rounded-3xl bg-card p-6 shadow-soft sm:inset-x-auto sm:left-1/2 sm:max-w-md sm:-translate-x-1/2"
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          >
            {/* Header */}
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-bold text-foreground">
                {event ? 'Edit Event' : 'Add Class'}
              </h2>
              <button
                onClick={onClose}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Form */}
            <div className="space-y-5">
              {/* Title */}
              <div>
                <Label htmlFor="title" className="text-sm font-medium">
                  Class Name *
                </Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Mathematics 101"
                  className="mt-1.5"
                />
              </div>

              {/* Location */}
              <div>
                <Label htmlFor="location" className="text-sm font-medium">
                  Location
                </Label>
                <Input
                  id="location"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g., Room 205, Building A"
                  className="mt-1.5"
                />
              </div>

              {/* Day selector */}
              <div>
                <Label className="text-sm font-medium">Day</Label>
                <div className="mt-1.5 flex flex-wrap gap-2">
                  {dayNames.map((day, idx) => (
                    <button
                      key={day}
                      onClick={() => setDayOfWeek(idx)}
                      className={cn(
                        'rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                        dayOfWeek === idx
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground hover:bg-accent'
                      )}
                    >
                      {day.slice(0, 3)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Time */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="startTime" className="text-sm font-medium">
                    Start Time
                  </Label>
                  <Input
                    id="startTime"
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label htmlFor="endTime" className="text-sm font-medium">
                    End Time
                  </Label>
                  <Input
                    id="endTime"
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="mt-1.5"
                  />
                </div>
              </div>

              {/* Color */}
              <div>
                <Label className="text-sm font-medium">Color</Label>
                <div className="mt-1.5 flex flex-wrap gap-2">
                  {colorOptions.map((c) => (
                    <button
                      key={c}
                      onClick={() => setColor(c)}
                      className={cn(
                        'h-8 w-8 rounded-full transition-transform',
                        color === c && 'ring-2 ring-foreground ring-offset-2'
                      )}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              {/* Reminders */}
              <div>
                <Label className="text-sm font-medium">Remind me before</Label>
                <div className="mt-1.5 flex flex-wrap gap-2">
                  {defaultReminderOptions.map((mins) => (
                    <button
                      key={mins}
                      onClick={() => toggleReminder(mins)}
                      className={cn(
                        'rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                        reminderMinutes.includes(mins)
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground hover:bg-accent'
                      )}
                    >
                      {mins < 60 ? `${mins}m` : `${mins / 60}h`}
                    </button>
                  ))}
                </div>

                {/* Custom reminder */}
                <div className="mt-2 flex gap-2">
                  <Input
                    type="number"
                    placeholder="Custom mins"
                    value={customReminder}
                    onChange={(e) => setCustomReminder(e.target.value)}
                    className="flex-1"
                    min="1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={addCustomReminder}
                    disabled={!customReminder}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>

                {/* Current reminders */}
                {reminderMinutes.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {reminderMinutes.map((mins) => (
                      <span
                        key={mins}
                        className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-1 text-xs font-medium text-primary"
                      >
                        {mins}m before
                        <button
                          onClick={() => toggleReminder(mins)}
                          className="ml-1 text-primary/60 hover:text-primary"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Voice reminder */}
              <div className="flex items-center justify-between rounded-xl bg-muted p-4">
                <div className="flex items-center gap-3">
                  {voiceEnabled ? (
                    <Volume2 className="h-5 w-5 text-primary" />
                  ) : (
                    <VolumeX className="h-5 w-5 text-muted-foreground" />
                  )}
                  <div>
                    <p className="text-sm font-medium">Voice Reminder</p>
                    <p className="text-xs text-muted-foreground">
                      Speak reminder aloud
                    </p>
                  </div>
                </div>
                <Switch
                  checked={voiceEnabled}
                  onCheckedChange={setVoiceEnabled}
                />
              </div>
            </div>

            {/* Actions */}
            <div className="mt-6 flex gap-3">
              <Button
                variant="outline"
                onClick={onClose}
                className="flex-1"
                disabled={saving}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                className="btn-primary-gradient flex-1"
                disabled={!title.trim() || saving}
              >
                {saving ? 'Saving...' : event ? 'Update' : 'Add Class'}
              </Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
