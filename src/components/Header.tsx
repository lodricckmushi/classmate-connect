import { motion } from 'framer-motion';
import { Bell, BellOff } from 'lucide-react';

interface HeaderProps {
  title: string;
  subtitle?: string;
  notificationsEnabled?: boolean;
  onNotificationToggle?: () => void;
}

export function Header({ title, subtitle, notificationsEnabled, onNotificationToggle }: HeaderProps) {
  return (
    <header className="glass-header sticky top-0 z-40 safe-top">
      <div className="flex items-center justify-between px-4 py-4">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
        >
          <h1 className="text-2xl font-bold text-foreground">{title}</h1>
          {subtitle && (
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          )}
        </motion.div>
        
        {onNotificationToggle && (
          <motion.button
            onClick={onNotificationToggle}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            whileTap={{ scale: 0.95 }}
          >
            {notificationsEnabled ? (
              <Bell className="h-5 w-5" />
            ) : (
              <BellOff className="h-5 w-5" />
            )}
          </motion.button>
        )}
      </div>
    </header>
  );
}
