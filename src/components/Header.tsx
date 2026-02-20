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
    <header className="sticky top-0 z-40 safe-top">
      {/* Frosted glass bg */}
      <div className="absolute inset-0 bg-background/80 backdrop-blur-2xl border-b border-border/30" />

      <div className="relative flex items-center justify-between px-4 py-3">
        <motion.div
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.25 }}
        >
          <h1 className="text-xl font-bold tracking-tight text-foreground">{title}</h1>
          {subtitle && (
            <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
          )}
        </motion.div>

        {onNotificationToggle && (
          <motion.button
            onClick={onNotificationToggle}
            className="flex h-8 w-8 items-center justify-center rounded-xl bg-muted/70 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            whileTap={{ scale: 0.92 }}
          >
            {notificationsEnabled
              ? <Bell className="h-4 w-4" />
              : <BellOff className="h-4 w-4" />
            }
          </motion.button>
        )}
      </div>
    </header>
  );
}
