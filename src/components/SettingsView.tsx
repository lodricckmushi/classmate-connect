import { motion } from 'framer-motion';
import { Bell, Volume2, Trash2, Download, Info, ChevronRight } from 'lucide-react';
import { Header } from '@/components/Header';
import { useSettings } from '@/hooks/useSettings';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { requestNotificationPermission, speakText } from '@/lib/reminders';
import { clearAllData } from '@/lib/db';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export function SettingsView() {
  const { settings, update, loading } = useSettings();
  const { isInstallable, isInstalled, install } = usePWAInstall();

  const handleNotificationToggle = async (enabled: boolean) => {
    if (enabled) {
      const granted = await requestNotificationPermission();
      if (!granted) {
        toast.error('Notification permission denied');
        return;
      }
    }
    await update({ notificationsEnabled: enabled });
    toast.success(enabled ? 'Notifications enabled' : 'Notifications disabled');
  };

  const handleVoiceToggle = async (enabled: boolean) => {
    await update({ voiceRemindersEnabled: enabled });
    if (enabled) {
      try {
        await speakText('Voice reminders are now enabled');
      } catch (e) {
        console.warn('Voice test failed:', e);
      }
    }
  };

  const handleVolumeChange = async (value: number[]) => {
    await update({ voiceVolume: value[0] });
  };

  const handleRateChange = async (value: number[]) => {
    await update({ voiceRate: value[0] });
  };

  const handleTestVoice = async () => {
    try {
      await speakText(
        'This is a test reminder. Your class starts in 10 minutes.',
        settings?.voiceVolume || 1,
        settings?.voiceRate || 1
      );
    } catch (e) {
      toast.error('Voice synthesis not supported on this device');
    }
  };

  const handleInstall = async () => {
    const success = await install();
    if (success) {
      toast.success('App installed successfully!');
    }
  };

  const handleClearData = async () => {
    if (confirm('Are you sure you want to delete all data? This cannot be undone.')) {
      await clearAllData();
      toast.success('All data cleared');
      window.location.reload();
    }
  };

  if (loading || !settings) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24">
      <Header 
        title="Settings"
        subtitle="Customize your experience"
      />

      <main className="px-4 py-4 space-y-6">
        {/* Install prompt */}
        {isInstallable && (
          <motion.div
            className="rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 p-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/20">
                <Download className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-foreground">Install ClassPing</h3>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  Add to your home screen for the best experience
                </p>
                <Button
                  onClick={handleInstall}
                  className="mt-3 btn-primary-gradient"
                  size="sm"
                >
                  Install App
                </Button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Notifications section */}
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Notifications
          </h2>
          <div className="space-y-3">
            <SettingItem
              icon={Bell}
              title="Push Notifications"
              description="Get notified before classes"
              action={
                <Switch
                  checked={settings.notificationsEnabled}
                  onCheckedChange={handleNotificationToggle}
                />
              }
            />
          </div>
        </section>

        {/* Voice section */}
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Voice Reminders
          </h2>
          <div className="space-y-3">
            <SettingItem
              icon={Volume2}
              title="Voice Announcements"
              description="Speak reminders out loud"
              action={
                <Switch
                  checked={settings.voiceRemindersEnabled}
                  onCheckedChange={handleVoiceToggle}
                />
              }
            />

            {settings.voiceRemindersEnabled && (
              <>
                <div className="rounded-2xl bg-card p-4 shadow-card">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Volume</span>
                    <span className="text-xs text-muted-foreground">
                      {Math.round(settings.voiceVolume * 100)}%
                    </span>
                  </div>
                  <Slider
                    value={[settings.voiceVolume]}
                    onValueChange={handleVolumeChange}
                    min={0.1}
                    max={1}
                    step={0.1}
                    className="mt-3"
                  />
                </div>

                <div className="rounded-2xl bg-card p-4 shadow-card">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Speech Speed</span>
                    <span className="text-xs text-muted-foreground">
                      {settings.voiceRate.toFixed(1)}x
                    </span>
                  </div>
                  <Slider
                    value={[settings.voiceRate]}
                    onValueChange={handleRateChange}
                    min={0.5}
                    max={1.5}
                    step={0.1}
                    className="mt-3"
                  />
                </div>

                <Button
                  onClick={handleTestVoice}
                  variant="outline"
                  className="w-full"
                >
                  Test Voice Reminder
                </Button>
              </>
            )}
          </div>
        </section>

        {/* Data section */}
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Data
          </h2>
          <div className="space-y-3">
            <SettingItem
              icon={Trash2}
              title="Clear All Data"
              description="Delete all classes and reminders"
              action={
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearData}
                  className="text-destructive hover:text-destructive"
                >
                  Clear
                </Button>
              }
            />
          </div>
        </section>

        {/* About section */}
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            About
          </h2>
          <div className="rounded-2xl bg-card p-4 shadow-card">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                <span className="text-2xl">📚</span>
              </div>
              <div>
                <h3 className="font-bold text-foreground">ClassPing</h3>
                <p className="text-xs text-muted-foreground">
                  Version 1.0.0 • Made for students
                </p>
              </div>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              Never miss a class again with smart reminders and voice announcements. 
              Works offline so you're always on time.
            </p>

            {isInstalled && (
              <div className="mt-3 flex items-center gap-2 rounded-lg bg-success/10 p-2 text-sm text-success">
                <Info className="h-4 w-4" />
                App installed successfully
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

function SettingItem({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: typeof Bell;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between rounded-2xl bg-card p-4 shadow-card">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
          <Icon className="h-5 w-5 text-muted-foreground" />
        </div>
        <div>
          <h3 className="font-medium text-foreground">{title}</h3>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
      {action}
    </div>
  );
}
