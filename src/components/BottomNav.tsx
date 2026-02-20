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
  { id: 'timetable', label: 'Table', icon: Calendar },
  { id: 'add', label: 'Add', icon: Plus, isAction: true },
  { id: 'reminders', label: 'Alerts', icon: Bell },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export function BottomNav({ activeTab, onTabChange, onAddClick }: BottomNavProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 safe-bottom">
      {/* Frosted backdrop */}
      <div className="absolute inset-0 bg-background/85 backdrop-blur-2xl border-t border-border/40" />

      <div className="relative flex items-end justify-around px-1 pt-1.5 pb-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          if (item.isAction) {
            return (
              <div key={item.id} className="flex flex-col items-center pb-0.5">
                <motion.button
                  onClick={onAddClick}
                  className="flex h-12 w-12 items-center justify-center rounded-2xl text-primary-foreground shadow-button -mt-5"
                  style={{ background: 'var(--gradient-primary)' }}
                  whileTap={{ scale: 0.92 }}
                  whileHover={{ scale: 1.04 }}
                >
                  <motion.div
                    animate={{ rotate: 0 }}
                    whileTap={{ rotate: 45 }}
                    transition={{ duration: 0.15 }}
                  >
                    <Icon className="h-5 w-5" />
                  </motion.div>
                </motion.button>
                <span className="mt-1 text-[9px] font-medium text-muted-foreground">Add</span>
              </div>
            );
          }

          return (
            <motion.button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className="relative flex flex-col items-center gap-0.5 min-w-[52px] px-1 py-0.5"
              whileTap={{ scale: 0.92 }}
            >
              {/* Active pill bg */}
              <AnimatePresence>
                {isActive && (
                  <motion.div
                    className="absolute inset-x-1 top-0 h-7 rounded-xl bg-primary/10"
                    layoutId="nav-pill"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}
              </AnimatePresence>

              <div className="relative flex h-7 w-7 items-center justify-center">
                <Icon
                  className={cn(
                    'h-4.5 w-4.5 transition-colors duration-200',
                    isActive ? 'text-primary' : 'text-muted-foreground'
                  )}
                  style={{ height: '18px', width: '18px' }}
                />
              </div>
              <span className={cn(
                'text-[9px] font-medium transition-colors duration-200',
                isActive ? 'text-primary' : 'text-muted-foreground'
              )}>
                {item.label}
              </span>
            </motion.button>
          );
        })}
      </div>
    </nav>
  );
}
