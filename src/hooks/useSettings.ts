import { useState, useEffect } from 'react';
import { getSettings, updateSettings, AppSettings } from '@/lib/db';

export function useSettings() {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);

  const loadSettings = async () => {
    setLoading(true);
    const s = await getSettings();
    setSettings(s);
    setLoading(false);
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const update = async (updates: Partial<AppSettings>) => {
    const updated = await updateSettings(updates);
    setSettings(updated);
    return updated;
  };

  return { settings, loading, update, refresh: loadSettings };
}
