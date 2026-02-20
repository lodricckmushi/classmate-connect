import { motion } from 'framer-motion';
import { Moon, Sun, Monitor, Check } from 'lucide-react';
import { useTheme, Theme, ColorTheme } from '@/hooks/useTheme';
import { cn } from '@/lib/utils';

const THEME_OPTIONS: { value: Theme; label: string; icon: typeof Sun }[] = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'Auto', icon: Monitor },
];

const COLOR_THEMES: { value: ColorTheme; label: string; color: string }[] = [
  { value: 'coral',  label: 'Coral',  color: 'hsl(16, 85%, 60%)' },
  { value: 'ocean',  label: 'Ocean',  color: 'hsl(200, 80%, 50%)' },
  { value: 'forest', label: 'Forest', color: 'hsl(142, 70%, 45%)' },
  { value: 'violet', label: 'Violet', color: 'hsl(270, 70%, 60%)' },
  { value: 'sunset', label: 'Sunset', color: 'hsl(38, 92%, 50%)' },
];

export function ThemeSettings() {
  const { theme, colorTheme, setTheme, setColorTheme } = useTheme();

  return (
    <div className="space-y-4">
      {/* Appearance mode */}
      <div>
        <p className="mb-2 text-xs font-medium text-muted-foreground">Appearance</p>
        <div className="grid grid-cols-3 gap-1.5">
          {THEME_OPTIONS.map(({ value, label, icon: Icon }) => {
            const active = theme === value;
            return (
              <motion.button
                key={value}
                onClick={() => setTheme(value)}
                whileTap={{ scale: 0.94 }}
                className={cn(
                  'flex flex-col items-center gap-1.5 rounded-xl py-2.5 transition-colors',
                  active
                    ? 'bg-primary/10 border border-primary/30'
                    : 'bg-muted/50 border border-transparent hover:bg-muted/80'
                )}
              >
                <Icon className={cn('h-4 w-4', active ? 'text-primary' : 'text-muted-foreground')} />
                <span className={cn('text-[11px] font-medium', active ? 'text-primary' : 'text-muted-foreground')}>
                  {label}
                </span>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Accent color */}
      <div>
        <p className="mb-2 text-xs font-medium text-muted-foreground">Accent Color</p>
        <div className="flex items-center gap-3">
          {COLOR_THEMES.map(({ value, label, color }) => {
            const active = colorTheme === value;
            return (
              <motion.button
                key={value}
                onClick={() => setColorTheme(value)}
                whileTap={{ scale: 0.88 }}
                className="flex flex-col items-center gap-1"
                title={label}
              >
                <div
                  className={cn(
                    'flex h-8 w-8 items-center justify-center rounded-full transition-all',
                    active && 'ring-2 ring-offset-2 ring-offset-card'
                  )}
                  style={{
                    backgroundColor: color,
                    boxShadow: active ? `0 0 0 2px ${color}` : undefined,
                  }}
                >
                  {active && <Check className="h-4 w-4 text-white" />}
                </div>
                <span className={cn('text-[10px]', active ? 'font-semibold text-primary' : 'text-muted-foreground')}>
                  {label}
                </span>
              </motion.button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
