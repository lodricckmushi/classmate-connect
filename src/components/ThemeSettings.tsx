import { motion } from 'framer-motion';
import { Moon, Sun, Monitor, Check } from 'lucide-react';
import { useTheme, Theme, ColorTheme } from '@/hooks/useTheme';
import { cn } from '@/lib/utils';

const THEME_OPTIONS: { value: Theme; label: string; icon: typeof Sun }[] = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
];

const COLOR_THEMES: { value: ColorTheme; label: string; color: string }[] = [
  { value: 'coral', label: 'Coral', color: 'hsl(16, 85%, 60%)' },
  { value: 'ocean', label: 'Ocean', color: 'hsl(200, 80%, 50%)' },
  { value: 'forest', label: 'Forest', color: 'hsl(142, 70%, 45%)' },
  { value: 'violet', label: 'Violet', color: 'hsl(270, 70%, 60%)' },
  { value: 'sunset', label: 'Sunset', color: 'hsl(38, 92%, 50%)' },
];

export function ThemeSettings() {
  const { theme, colorTheme, setTheme, setColorTheme } = useTheme();

  return (
    <div className="space-y-6">
      {/* Appearance Mode */}
      <div>
        <h3 className="mb-3 text-sm font-medium text-foreground">Appearance</h3>
        <div className="grid grid-cols-3 gap-2">
          {THEME_OPTIONS.map(({ value, label, icon: Icon }) => (
            <motion.button
              key={value}
              onClick={() => setTheme(value)}
              whileTap={{ scale: 0.95 }}
              className={cn(
                'flex flex-col items-center gap-2 rounded-xl p-3 transition-colors',
                theme === value
                  ? 'bg-primary/10 border-2 border-primary'
                  : 'bg-muted border-2 border-transparent hover:bg-muted/80'
              )}
            >
              <Icon className={cn(
                'h-5 w-5',
                theme === value ? 'text-primary' : 'text-muted-foreground'
              )} />
              <span className={cn(
                'text-xs font-medium',
                theme === value ? 'text-primary' : 'text-muted-foreground'
              )}>
                {label}
              </span>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Color Theme */}
      <div>
        <h3 className="mb-3 text-sm font-medium text-foreground">Accent Color</h3>
        <div className="flex flex-wrap gap-3">
          {COLOR_THEMES.map(({ value, label, color }) => (
            <motion.button
              key={value}
              onClick={() => setColorTheme(value)}
              whileTap={{ scale: 0.9 }}
              className="flex flex-col items-center gap-1.5"
            >
              <div
                className={cn(
                  'flex h-10 w-10 items-center justify-center rounded-full transition-all',
                  colorTheme === value && 'ring-2 ring-offset-2 ring-offset-background'
                )}
                style={{ 
                  backgroundColor: color,
                  boxShadow: colorTheme === value ? `0 0 0 2px ${color}` : undefined
                }}
              >
                {colorTheme === value && (
                  <Check className="h-5 w-5 text-white" />
                )}
              </div>
              <span className={cn(
                'text-xs',
                colorTheme === value ? 'text-primary font-medium' : 'text-muted-foreground'
              )}>
                {label}
              </span>
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  );
}
