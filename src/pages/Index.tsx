import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BottomNav } from '@/components/BottomNav';
import { TodayView } from '@/components/TodayView';
import { TimetableView } from '@/components/TimetableView';
import { RemindersView } from '@/components/RemindersView';
import { SettingsView } from '@/components/SettingsView';
import { EventForm } from '@/components/EventForm';
import { TimetableUpload } from '@/components/TimetableUpload';
 import { NotificationOnboarding } from '@/components/NotificationOnboarding';
 import { useReminderChecker, registerServiceWorker, getNotificationPermissionState } from '@/lib/reminders';
 import { ClassEvent, deleteEvent, getSettings, updateSettings } from '@/lib/db';
import { useTheme } from '@/hooks/useTheme';
import { toast } from 'sonner';

const Index = () => {
  const [activeTab, setActiveTab] = useState('today');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<ClassEvent | undefined>();
  const [refreshKey, setRefreshKey] = useState(0);
   const [showOnboarding, setShowOnboarding] = useState(false);
   const [isLoading, setIsLoading] = useState(true);

  // Initialize theme
  useTheme();

  // Run reminder checker
  useReminderChecker(30000); // Check every 30 seconds

   // Check if onboarding is needed and register service worker
  useEffect(() => {
     const init = async () => {
       // Register service worker (doesn't require permission)
       registerServiceWorker();
       
       // Check if we need to show onboarding
       const settings = await getSettings();
       const permissionState = getNotificationPermissionState();
       
       // Show onboarding if:
       // 1. Onboarding not completed AND
       // 2. Permission not already granted
       if (!settings.onboardingCompleted && permissionState !== 'granted') {
         setShowOnboarding(true);
       }
       
       setIsLoading(false);
     };
     
     init();
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

   const handleOnboardingComplete = useCallback(async () => {
     await updateSettings({ 
       onboardingCompleted: true,
       permissionAskedAt: Date.now()
     });
     setShowOnboarding(false);
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

   // Show loading state briefly
   if (isLoading) {
     return (
       <div className="min-h-screen bg-background flex items-center justify-center">
         <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
       </div>
     );
   }

   // Show onboarding if needed
   if (showOnboarding) {
     return <NotificationOnboarding onComplete={handleOnboardingComplete} />;
   }

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
