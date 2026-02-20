import { motion } from 'framer-motion';
import { Bell, Volume2, Trash2, Download, Info, Palette, Timer, ChevronRight, Repeat, Shield } from 'lucide-react';
import { Header } from '@/components/Header';
import { ThemeSettings } from '@/components/ThemeSettings';
import { useSettings } from '@/hooks/useSettings';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { requestNotificationPermission, speakText } from '@/lib/reminders';
import { clearAllData } from '@/lib/db';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { useState } from 'react';
import { cn } from '@/lib/utils';

export function SettingsView() {
  const { settings, update, loading } = useSettings();
  const { isInstallable, isInstalled, install } = usePWAInstall();
  const [expandedSection, setExpandedSection] = useState<string | null>('notifications');

  const toggleSection = (id: string) =>
    setExpandedSection(prev => (prev === id ? null : id));

  const handleNotificationToggle = async (enabled: boolean) => {
    if (enabled) {
      const granted = await requestNotificationPermission();
      if (!granted) {
        toast.error('Permission denied. Enable in browser settings.');
        return;
      }
    }
    await update({ notificationsEnabled: enabled });
    toast.success(enabled ? 'Notifications enabled' : 'Notifications disabled');
  };

  const handleVoiceToggle = async (enabled: boolean) => {
    await update({ voiceRemindersEnabled: enabled });
    if (enabled) {
      try { await speakText('Voice reminders enabled'); } catch { /* ignore */ }
    }
  };

  const handleVolumeChange = async (value: number[]) => update({ voiceVolume: value[0] });
  const handleRateChange = async (value: number[]) => update({ voiceRate: value[0] });

  const handleTestVoice = async () => {
    try {
      await speakText(
        'This is a test reminder. Your class starts in 10 minutes.',
        settings?.voiceVolume || 1,
        settings?.voiceRate || 1
      );
    } catch {
      toast.error('Voice not supported on this device');
    }
  };

  const handleClearData = async () => {
    if (confirm('Delete ALL data? This cannot be undone.')) {
      await clearAllData();
      toast.success('All data cleared');
      window.location.reload();
    }
  };

  if (loading || !settings) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-7 w-7 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-28">
      <Header title="Settings" subtitle="Customize your experience" />

      <main className="px-4 py-3 space-y-2">

        {/* Install Banner */}
        {isInstallable && (
          <motion.div
            className="rounded-2xl overflow-hidden"
            style={{ background: 'var(--gradient-primary)' }}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex items-center gap-3 p-3.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/20">
                <Download className="h-4 w-4 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white leading-tight">Install ClassPing</p>
                <p className="text-xs text-white/75 leading-tight">Best experience on home screen</p>
              </div>
              <Button
                onClick={async () => {
                  const ok = await install();
                  if (ok) toast.success('App installed!');
                }}
                className="shrink-0 h-7 text-xs px-3 rounded-lg bg-white/20 hover:bg-white/30 text-white border-0 font-medium"
                size="sm"
              >
                Install
              </Button>
            </div>
          </motion.div>
        )}

        {/* Theme */}
        <AccordionSection
          id="theme"
          icon={Palette}
          title="Appearance"
          expanded={expandedSection === 'theme'}
          onToggle={() => toggleSection('theme')}
        >
          <div className="px-1 pb-1">
            <ThemeSettings />
          </div>
        </AccordionSection>

        {/* Notifications */}
        <AccordionSection
          id="notifications"
          icon={Bell}
          title="Notifications"
          badge={settings.notificationsEnabled ? 'On' : 'Off'}
          badgeActive={settings.notificationsEnabled}
          expanded={expandedSection === 'notifications'}
          onToggle={() => toggleSection('notifications')}
        >
          <div className="space-y-1">
            {/* Push toggle */}
            <RowItem
              icon={Bell}
              label="Push Notifications"
              sub="Alerts before your classes"
              action={
                <Switch
                  checked={settings.notificationsEnabled}
                  onCheckedChange={handleNotificationToggle}
                  className="scale-[0.8] origin-right"
                />
              }
            />

            {/* Alarm re-trigger */}
            <RowItem
              icon={Repeat}
              label="Alarm Repeat"
              sub="Re-ping until dismissed"
              action={
                <Select
                  value={String(settings.alarmRetriggerInterval || 15)}
                  onValueChange={(v) => update({ alarmRetriggerInterval: Number(v) as 10 | 15 | 30 })}
                >
                  <SelectTrigger className="w-[72px] h-7 text-xs border-border/60 rounded-lg">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10 s</SelectItem>
                    <SelectItem value="15">15 s</SelectItem>
                    <SelectItem value="30">30 s</SelectItem>
                  </SelectContent>
                </Select>
              }
            />
          </div>
        </AccordionSection>

        {/* Voice */}
        <AccordionSection
          id="voice"
          icon={Volume2}
          title="Voice Reminders"
          badge={settings.voiceRemindersEnabled ? 'On' : 'Off'}
          badgeActive={settings.voiceRemindersEnabled}
          expanded={expandedSection === 'voice'}
          onToggle={() => toggleSection('voice')}
        >
          <div className="space-y-1">
            <RowItem
              icon={Volume2}
              label="Voice Announcements"
              sub="Speak reminders aloud"
              action={
                <Switch
                  checked={settings.voiceRemindersEnabled}
                  onCheckedChange={handleVoiceToggle}
                  className="scale-[0.8] origin-right"
                />
              }
            />

            {settings.voiceRemindersEnabled && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-1"
              >
                {/* Volume */}
                <div className="rounded-xl bg-muted/50 px-3 py-2.5">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-foreground">Volume</span>
                    <span className="text-xs text-muted-foreground font-mono">
                      {Math.round(settings.voiceVolume * 100)}%
                    </span>
                  </div>
                  <Slider
                    value={[settings.voiceVolume]}
                    onValueChange={handleVolumeChange}
                    min={0.1} max={1} step={0.1}
                  />
                </div>

                {/* Speed */}
                <div className="rounded-xl bg-muted/50 px-3 py-2.5">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-foreground">Speed</span>
                    <span className="text-xs text-muted-foreground font-mono">
                      {settings.voiceRate.toFixed(1)}×
                    </span>
                  </div>
                  <Slider
                    value={[settings.voiceRate]}
                    onValueChange={handleRateChange}
                    min={0.5} max={1.5} step={0.1}
                  />
                </div>

                <Button
                  onClick={handleTestVoice}
                  variant="outline"
                  className="w-full h-8 text-xs rounded-xl border-border/60"
                  size="sm"
                >
                  🔊 Test Voice Reminder
                </Button>
              </motion.div>
            )}
          </div>
        </AccordionSection>

        {/* Data */}
        <AccordionSection
          id="data"
          icon={Shield}
          title="Data & Privacy"
          expanded={expandedSection === 'data'}
          onToggle={() => toggleSection('data')}
        >
          <RowItem
            icon={Trash2}
            label="Clear All Data"
            sub="Delete classes and reminders"
            danger
            action={
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearData}
                className="h-7 text-xs px-2 text-destructive hover:text-destructive hover:bg-destructive/10 rounded-lg"
              >
                Clear
              </Button>
            }
          />
        </AccordionSection>

        {/* About */}
        <div className="rounded-2xl bg-card border border-border/40 overflow-hidden">
          <div className="flex items-center gap-3 p-3.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-xl">
              📚
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-foreground">ClassPing</p>
              <p className="text-xs text-muted-foreground">v1.0.0 · Made for students</p>
            </div>
            {isInstalled && (
              <span className="flex items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-xs font-medium text-success">
                <Info className="h-3 w-3" /> Installed
              </span>
            )}
          </div>
          <div className="px-3.5 pb-3.5">
            <p className="text-xs text-muted-foreground leading-relaxed">
              Smart reminders + voice alerts so you never miss a class. Works 100% offline.
            </p>
          </div>
        </div>

      </main>
    </div>
  );
}

/* ── Accordion Section ─────────────────────────────────── */
function AccordionSection({
  id, icon: Icon, title, badge, badgeActive,
  expanded, onToggle, children,
}: {
  id: string;
  icon: typeof Bell;
  title: string;
  badge?: string;
  badgeActive?: boolean;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl bg-card border border-border/40 overflow-hidden">
      <button
        onClick={onToggle}
        className="flex w-full items-center gap-3 px-3.5 py-3 text-left transition-colors hover:bg-muted/30 active:bg-muted/50"
      >
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary/10">
          <Icon className="h-4 w-4 text-primary" />
        </div>
        <span className="flex-1 text-sm font-semibold text-foreground">{title}</span>
        {badge && (
          <span className={cn(
            'rounded-full px-2 py-0.5 text-xs font-medium',
            badgeActive ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'
          )}>
            {badge}
          </span>
        )}
        <motion.div
          animate={{ rotate: expanded ? 90 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </motion.div>
      </button>

      <motion.div
        initial={false}
        animate={expanded ? { height: 'auto', opacity: 1 } : { height: 0, opacity: 0 }}
        transition={{ duration: 0.25, ease: 'easeInOut' }}
        style={{ overflow: 'hidden' }}
      >
        <div className="border-t border-border/30 px-2 pb-2 pt-1">
          {children}
        </div>
      </motion.div>
    </div>
  );
}

/* ── Row Item ──────────────────────────────────────────── */
function RowItem({
  icon: Icon, label, sub, action, danger,
}: {
  icon: typeof Bell;
  label: string;
  sub: string;
  action?: React.ReactNode;
  danger?: boolean;
}) {
  return (
    <div className="flex items-center justify-between rounded-xl px-2 py-2.5 hover:bg-muted/30 transition-colors">
      <div className="flex items-center gap-2.5 min-w-0 flex-1">
        <div className={cn(
          'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg',
          danger ? 'bg-destructive/10' : 'bg-muted'
        )}>
          <Icon className={cn('h-3.5 w-3.5', danger ? 'text-destructive' : 'text-muted-foreground')} />
        </div>
        <div className="min-w-0">
          <p className={cn('text-sm font-medium leading-tight', danger ? 'text-destructive' : 'text-foreground')}>
            {label}
          </p>
          <p className="text-xs text-muted-foreground leading-tight">{sub}</p>
        </div>
      </div>
      <div className="shrink-0 ml-2">{action}</div>
    </div>
  );
}
