import { useState, useEffect, useCallback } from 'react';
import { getSettings, updateSettings } from '@/lib/db';

export type Theme = 'light' | 'dark' | 'system';
export type ColorTheme = 'coral' | 'ocean' | 'forest' | 'violet' | 'sunset';

export interface ThemeSettings {
  theme: Theme;
  colorTheme: ColorTheme;
}

const COLOR_THEMES: Record<ColorTheme, { light: Record<string, string>; dark: Record<string, string> }> = {
  coral: {
    light: {
      '--primary': '16 85% 60%',
      '--ring': '16 85% 60%',
      '--sidebar-primary': '16 85% 60%',
      '--sidebar-ring': '16 85% 60%',
      '--reminder-active': '16 85% 60%',
    },
    dark: {
      '--primary': '16 85% 60%',
      '--ring': '16 85% 60%',
      '--sidebar-primary': '16 85% 60%',
      '--sidebar-ring': '16 85% 60%',
    },
  },
  ocean: {
    light: {
      '--primary': '200 80% 50%',
      '--ring': '200 80% 50%',
      '--sidebar-primary': '200 80% 50%',
      '--sidebar-ring': '200 80% 50%',
      '--reminder-active': '200 80% 50%',
    },
    dark: {
      '--primary': '200 80% 55%',
      '--ring': '200 80% 55%',
      '--sidebar-primary': '200 80% 55%',
      '--sidebar-ring': '200 80% 55%',
    },
  },
  forest: {
    light: {
      '--primary': '142 70% 45%',
      '--ring': '142 70% 45%',
      '--sidebar-primary': '142 70% 45%',
      '--sidebar-ring': '142 70% 45%',
      '--reminder-active': '142 70% 45%',
    },
    dark: {
      '--primary': '142 60% 50%',
      '--ring': '142 60% 50%',
      '--sidebar-primary': '142 60% 50%',
      '--sidebar-ring': '142 60% 50%',
    },
  },
  violet: {
    light: {
      '--primary': '270 70% 60%',
      '--ring': '270 70% 60%',
      '--sidebar-primary': '270 70% 60%',
      '--sidebar-ring': '270 70% 60%',
      '--reminder-active': '270 70% 60%',
    },
    dark: {
      '--primary': '270 70% 65%',
      '--ring': '270 70% 65%',
      '--sidebar-primary': '270 70% 65%',
      '--sidebar-ring': '270 70% 65%',
    },
  },
  sunset: {
    light: {
      '--primary': '38 92% 50%',
      '--ring': '38 92% 50%',
      '--sidebar-primary': '38 92% 50%',
      '--sidebar-ring': '38 92% 50%',
      '--reminder-active': '38 92% 50%',
    },
    dark: {
      '--primary': '38 85% 55%',
      '--ring': '38 85% 55%',
      '--sidebar-primary': '38 85% 55%',
      '--sidebar-ring': '38 85% 55%',
    },
  },
};

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>('system');
  const [colorTheme, setColorThemeState] = useState<ColorTheme>('coral');
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light');

  // Load theme from settings
  useEffect(() => {
    const loadTheme = async () => {
      const settings = await getSettings();
      const savedTheme = (settings as any).theme || 'system';
      const savedColorTheme = (settings as any).colorTheme || 'coral';
      setThemeState(savedTheme);
      setColorThemeState(savedColorTheme);
    };
    loadTheme();
  }, []);

  // Apply theme class and color variables
  useEffect(() => {
    const root = document.documentElement;
    
    // Determine actual theme
    let actualTheme: 'light' | 'dark';
    if (theme === 'system') {
      actualTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    } else {
      actualTheme = theme;
    }
    
    setResolvedTheme(actualTheme);
    
    // Apply dark/light class
    root.classList.remove('light', 'dark');
    root.classList.add(actualTheme);
    
    // Apply color theme variables
    const colors = COLOR_THEMES[colorTheme][actualTheme];
    Object.entries(colors).forEach(([key, value]) => {
      root.style.setProperty(key, value);
    });
  }, [theme, colorTheme]);

  // Listen for system theme changes
  useEffect(() => {
    if (theme !== 'system') return;
    
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      setResolvedTheme(e.matches ? 'dark' : 'light');
    };
    
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]);

  const setTheme = useCallback(async (newTheme: Theme) => {
    setThemeState(newTheme);
    await updateSettings({ theme: newTheme } as any);
  }, []);

  const setColorTheme = useCallback(async (newColorTheme: ColorTheme) => {
    setColorThemeState(newColorTheme);
    await updateSettings({ colorTheme: newColorTheme } as any);
  }, []);

  return {
    theme,
    colorTheme,
    resolvedTheme,
    setTheme,
    setColorTheme,
    colorThemes: Object.keys(COLOR_THEMES) as ColorTheme[],
  };
}
