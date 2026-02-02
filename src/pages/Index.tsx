import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BottomNav } from '@/components/BottomNav';
import { TodayView } from '@/components/TodayView';
import { TimetableView } from '@/components/TimetableView';
import { RemindersView } from '@/components/RemindersView';
import { SettingsView } from '@/components/SettingsView';
import { EventForm } from '@/components/EventForm';
import { TimetableUpload } from '@/components/TimetableUpload';
import { useReminderChecker, requestNotificationPermission } from '@/lib/reminders';
import { ClassEvent, deleteEvent } from '@/lib/db';
import { useTheme } from '@/hooks/useTheme';
import { toast } from 'sonner';

const Index = () => {
  const [activeTab, setActiveTab] = useState('today');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<ClassEvent | undefined>();
  const [refreshKey, setRefreshKey] = useState(0);

  // Initialize theme
  useTheme();

  // Run reminder checker
  useReminderChecker(30000); // Check every 30 seconds

  // Request notification permission on mount
  useEffect(() => {
    requestNotificationPermission();
  }, []);

  // Check URL params for add action
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('action') === 'add') {
      setIsFormOpen(true);
      // Clear the param
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const handleAddClick = () => {
    setEditingEvent(undefined);
    setIsFormOpen(true);
  };

  const handleEditEvent = useCallback((event: ClassEvent) => {
    setEditingEvent(event);
    setIsFormOpen(true);
  }, []);

  const handleDeleteEvent = useCallback(async (id: string) => {
    if (confirm('Delete this class and its reminders?')) {
      await deleteEvent(id);
      toast.success('Class deleted');
      setRefreshKey(k => k + 1);
    }
  }, []);

  const handleFormSave = useCallback(() => {
    setRefreshKey(k => k + 1);
    toast.success(editingEvent ? 'Class updated' : 'Class added');
  }, [editingEvent]);

  const handleFormClose = useCallback(() => {
    setIsFormOpen(false);
    setEditingEvent(undefined);
  }, []);

  const handleUploadClassesAdded = useCallback(() => {
    setRefreshKey(k => k + 1);
  }, []);

  const renderContent = () => {
    switch (activeTab) {
      case 'today':
        return (
          <TodayView 
            key={`today-${refreshKey}`}
            onEditEvent={handleEditEvent} 
            onDeleteEvent={handleDeleteEvent} 
          />
        );
      case 'timetable':
        return (
          <TimetableView 
            key={`timetable-${refreshKey}`}
            onEditEvent={handleEditEvent} 
            onDeleteEvent={handleDeleteEvent}
            onUploadClick={() => setIsUploadOpen(true)}
          />
        );
      case 'reminders':
        return <RemindersView key={`reminders-${refreshKey}`} />;
      case 'settings':
        return <SettingsView />;
      default:
        return <TodayView onEditEvent={handleEditEvent} onDeleteEvent={handleDeleteEvent} />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {renderContent()}
        </motion.div>
      </AnimatePresence>

      <BottomNav
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onAddClick={handleAddClick}
      />

      <EventForm
        event={editingEvent}
        isOpen={isFormOpen}
        onClose={handleFormClose}
        onSave={handleFormSave}
      />

      <TimetableUpload
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onClassesAdded={handleUploadClassesAdded}
      />
    </div>
  );
};

export default Index;
