import { motion, AnimatePresence } from 'framer-motion';
import { Home, Calendar, Plus, Settings, Bell } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BottomNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onAddClick: () => void;
}

const navItems = [
  { id: 'today', label: 'Today', icon: Home },
  { id: 'timetable', label: 'Timetable', icon: Calendar },
  { id: 'add', label: 'Add', icon: Plus, isAction: true },
  { id: 'reminders', label: 'Reminders', icon: Bell },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export function BottomNav({ activeTab, onTabChange, onAddClick }: BottomNavProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 glass-header safe-bottom">
      <div className="flex items-center justify-around px-2 py-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          
          if (item.isAction) {
            return (
              <motion.button
                key={item.id}
                onClick={onAddClick}
                className="relative -mt-6 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-button"
                whileTap={{ scale: 0.95 }}
                whileHover={{ scale: 1.05 }}
              >
                <Icon className="h-6 w-6" />
              </motion.button>
            );
          }

          return (
            <motion.button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={cn(
                'nav-item relative flex-1',
                isActive && 'active'
              )}
              whileTap={{ scale: 0.95 }}
            >
              <div className="relative">
                <Icon className="h-5 w-5" />
                <AnimatePresence>
                  {isActive && (
                    <motion.div
                      className="absolute -bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-primary"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                    />
                  )}
                </AnimatePresence>
              </div>
              <span className="text-[10px] font-medium">{item.label}</span>
            </motion.button>
          );
        })}
      </div>
    </nav>
  );
}
