 import { useState, useEffect } from 'react';
 import { motion, AnimatePresence } from 'framer-motion';
 import { Bell, BellRing, Settings, ChevronRight, CheckCircle2, XCircle, Volume2, Clock, Smartphone } from 'lucide-react';
 import { Button } from '@/components/ui/button';
 import { getSettings, updateSettings } from '@/lib/db';
 
 type PermissionState = 'unknown' | 'prompt' | 'granted' | 'denied';
 
 interface NotificationOnboardingProps {
   onComplete: () => void;
   onSkip?: () => void;
 }
 
 export function NotificationOnboarding({ onComplete, onSkip }: NotificationOnboardingProps) {
   const [step, setStep] = useState<'intro' | 'requesting' | 'granted' | 'denied'>('intro');
   const [permissionState, setPermissionState] = useState<PermissionState>('unknown');
 
   useEffect(() => {
     // Check current permission state
     if ('Notification' in window) {
       const current = Notification.permission;
       if (current === 'granted') {
         setPermissionState('granted');
         setStep('granted');
       } else if (current === 'denied') {
         setPermissionState('denied');
         setStep('denied');
       } else {
         setPermissionState('prompt');
       }
     } else {
       setPermissionState('denied');
       setStep('denied');
     }
   }, []);
 
   const handleEnableNotifications = async () => {
     setStep('requesting');
     
     try {
       const permission = await Notification.requestPermission();
       
       if (permission === 'granted') {
         setPermissionState('granted');
         setStep('granted');
         await updateSettings({ notificationsEnabled: true });
         
         // Show a test notification
         if ('serviceWorker' in navigator) {
           const registration = await navigator.serviceWorker.ready;
           await registration.showNotification('🎉 ClassPing Activated!', {
             body: 'Great! You\'ll now receive smart reminders for your classes.',
             icon: '/pwa-192x192.png',
             badge: '/pwa-192x192.png',
             tag: 'onboarding-success',
             requireInteraction: false,
           });
         }
         
         // Auto-proceed after short delay
         setTimeout(onComplete, 2000);
       } else {
         setPermissionState('denied');
         setStep('denied');
       }
     } catch (e) {
       console.error('Permission request failed:', e);
       setPermissionState('denied');
       setStep('denied');
     }
   };
 
   const handleSkip = async () => {
     await updateSettings({ notificationsEnabled: false });
     onSkip?.();
     onComplete();
   };
 
   return (
     <div className="fixed inset-0 z-50 bg-background flex flex-col">
       <AnimatePresence mode="wait">
         {step === 'intro' && (
           <IntroScreen 
             key="intro"
             onEnable={handleEnableNotifications}
             onSkip={handleSkip}
           />
         )}
         
         {step === 'requesting' && (
           <RequestingScreen key="requesting" />
         )}
         
         {step === 'granted' && (
           <GrantedScreen key="granted" onContinue={onComplete} />
         )}
         
         {step === 'denied' && (
           <DeniedScreen 
             key="denied" 
             onRetry={handleEnableNotifications}
             onSkip={handleSkip}
           />
         )}
       </AnimatePresence>
     </div>
   );
 }
 
 function IntroScreen({ onEnable, onSkip }: { onEnable: () => void; onSkip: () => void }) {
   return (
     <motion.div
       initial={{ opacity: 0 }}
       animate={{ opacity: 1 }}
       exit={{ opacity: 0 }}
       className="flex-1 flex flex-col p-6 safe-area-inset"
     >
       {/* Header */}
       <div className="flex justify-end">
         <Button variant="ghost" size="sm" onClick={onSkip} className="text-muted-foreground text-xs">
           Skip for now
         </Button>
       </div>
 
       {/* Main content */}
       <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
         {/* Animated Bell Icon */}
         <motion.div
           initial={{ scale: 0.8, opacity: 0 }}
           animate={{ scale: 1, opacity: 1 }}
           transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
           className="mb-8"
         >
           <div className="relative">
             <motion.div
               animate={{ rotate: [0, -10, 10, -10, 0] }}
               transition={{ repeat: Infinity, duration: 2, repeatDelay: 3 }}
               className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center"
             >
               <BellRing className="h-12 w-12 text-primary" />
             </motion.div>
             <motion.div
               initial={{ scale: 0 }}
               animate={{ scale: 1 }}
               transition={{ delay: 0.5, type: 'spring' }}
               className="absolute -top-1 -right-1 w-6 h-6 bg-primary rounded-full flex items-center justify-center"
             >
               <span className="text-primary-foreground text-xs font-bold">!</span>
             </motion.div>
           </div>
         </motion.div>
 
         <motion.h1
           initial={{ y: 20, opacity: 0 }}
           animate={{ y: 0, opacity: 1 }}
           transition={{ delay: 0.3 }}
           className="text-xl font-bold text-foreground mb-3"
         >
           Never Miss a Class Again
         </motion.h1>
 
         <motion.p
           initial={{ y: 20, opacity: 0 }}
           animate={{ y: 0, opacity: 1 }}
           transition={{ delay: 0.4 }}
           className="text-sm text-muted-foreground mb-8 max-w-xs"
         >
           Enable smart reminders to get timely alerts before your classes start — even when your phone is locked.
         </motion.p>
 
         {/* Feature highlights */}
         <motion.div
           initial={{ y: 20, opacity: 0 }}
           animate={{ y: 0, opacity: 1 }}
           transition={{ delay: 0.5 }}
           className="w-full max-w-xs space-y-3 mb-8"
         >
           <FeatureItem icon={Clock} text="Reminders 10-30 min before class" />
           <FeatureItem icon={Volume2} text="Voice alerts that speak to you" />
           <FeatureItem icon={Smartphone} text="Works even when app is closed" />
         </motion.div>
       </div>
 
       {/* Bottom CTA */}
       <motion.div
         initial={{ y: 20, opacity: 0 }}
         animate={{ y: 0, opacity: 1 }}
         transition={{ delay: 0.6 }}
         className="space-y-3 pb-4"
       >
         <Button
           onClick={onEnable}
           className="w-full h-12 text-base font-medium"
           size="lg"
         >
           <Bell className="h-5 w-5 mr-2" />
           Enable Smart Reminders
         </Button>
         <p className="text-xs text-muted-foreground text-center">
           You can change this anytime in Settings
         </p>
       </motion.div>
     </motion.div>
   );
 }
 
 function FeatureItem({ icon: Icon, text }: { icon: any; text: string }) {
   return (
     <div className="flex items-center gap-3 bg-muted/50 rounded-lg p-3">
       <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
         <Icon className="h-4 w-4 text-primary" />
       </div>
       <span className="text-sm text-foreground">{text}</span>
     </div>
   );
 }
 
 function RequestingScreen() {
   return (
     <motion.div
       initial={{ opacity: 0 }}
       animate={{ opacity: 1 }}
       exit={{ opacity: 0 }}
       className="flex-1 flex flex-col items-center justify-center p-6 text-center"
     >
       <motion.div
         animate={{ scale: [1, 1.1, 1] }}
         transition={{ repeat: Infinity, duration: 1.5 }}
         className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6"
       >
         <Bell className="h-10 w-10 text-primary" />
       </motion.div>
       <h2 className="text-lg font-semibold text-foreground mb-2">
         Allow Notifications
       </h2>
       <p className="text-sm text-muted-foreground max-w-xs">
         Tap <strong>"Allow"</strong> in the browser prompt to enable class reminders
       </p>
     </motion.div>
   );
 }
 
 function GrantedScreen({ onContinue }: { onContinue: () => void }) {
   return (
     <motion.div
       initial={{ opacity: 0 }}
       animate={{ opacity: 1 }}
       exit={{ opacity: 0 }}
       className="flex-1 flex flex-col items-center justify-center p-6 text-center"
     >
       <motion.div
         initial={{ scale: 0 }}
         animate={{ scale: 1 }}
         transition={{ type: 'spring', stiffness: 200, damping: 10 }}
         className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6"
       >
         <CheckCircle2 className="h-10 w-10 text-primary" />
       </motion.div>
       <h2 className="text-lg font-semibold text-foreground mb-2">
         You're All Set! 🎉
       </h2>
       <p className="text-sm text-muted-foreground max-w-xs mb-6">
         Smart reminders are now enabled. You'll never miss a class again!
       </p>
       <Button onClick={onContinue} size="lg">
         Get Started
         <ChevronRight className="h-4 w-4 ml-1" />
       </Button>
     </motion.div>
   );
 }
 
 function DeniedScreen({ onRetry, onSkip }: { onRetry: () => void; onSkip: () => void }) {
   const [showManualSteps, setShowManualSteps] = useState(false);
 
   return (
     <motion.div
       initial={{ opacity: 0 }}
       animate={{ opacity: 1 }}
       exit={{ opacity: 0 }}
       className="flex-1 flex flex-col p-6"
     >
       <div className="flex-1 flex flex-col items-center justify-center text-center">
         <motion.div
           initial={{ scale: 0 }}
           animate={{ scale: 1 }}
           className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center mb-6"
         >
           <XCircle className="h-10 w-10 text-destructive" />
         </motion.div>
 
         <h2 className="text-lg font-semibold text-foreground mb-2">
           Notifications Blocked
         </h2>
         <p className="text-sm text-muted-foreground max-w-xs mb-6">
           To receive class reminders, you'll need to enable notifications in your browser settings.
         </p>
 
         {!showManualSteps ? (
           <Button 
             variant="outline" 
             onClick={() => setShowManualSteps(true)}
             className="mb-4"
           >
             <Settings className="h-4 w-4 mr-2" />
             Show Me How
           </Button>
         ) : (
           <ManualEnableSteps />
         )}
       </div>
 
       <div className="space-y-3 pb-4">
         <Button onClick={onRetry} className="w-full">
           Try Again
         </Button>
         <Button variant="ghost" onClick={onSkip} className="w-full text-muted-foreground">
           Continue Without Reminders
         </Button>
       </div>
     </motion.div>
   );
 }
 
 function ManualEnableSteps() {
   const isAndroid = /android/i.test(navigator.userAgent);
   const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
   const isChrome = /chrome/i.test(navigator.userAgent);
 
   const steps = isAndroid ? [
     { step: 1, text: 'Tap the ⋮ menu (three dots) in Chrome' },
     { step: 2, text: 'Select "Settings" → "Site settings"' },
     { step: 3, text: 'Tap "Notifications"' },
     { step: 4, text: 'Find ClassPing and enable notifications' },
     { step: 5, text: 'Return to the app and tap "Try Again"' },
   ] : isIOS ? [
     { step: 1, text: 'Open iPhone Settings app' },
     { step: 2, text: 'Scroll down and tap Safari (or your browser)' },
     { step: 3, text: 'Enable "Notifications"' },
     { step: 4, text: 'Return to ClassPing and refresh the page' },
   ] : isChrome ? [
     { step: 1, text: 'Click the 🔒 lock icon in the address bar' },
     { step: 2, text: 'Find "Notifications" in the dropdown' },
     { step: 3, text: 'Change from "Block" to "Allow"' },
     { step: 4, text: 'Refresh the page and tap "Try Again"' },
   ] : [
     { step: 1, text: 'Open your browser settings' },
     { step: 2, text: 'Go to Site Settings or Permissions' },
     { step: 3, text: 'Find Notifications and enable for this site' },
     { step: 4, text: 'Refresh and try again' },
   ];
 
   return (
     <motion.div
       initial={{ opacity: 0, y: 10 }}
       animate={{ opacity: 1, y: 0 }}
       className="w-full max-w-xs bg-muted/50 rounded-xl p-4 mb-6"
     >
       <h3 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
         <Settings className="h-4 w-4" />
         {isAndroid ? 'For Android Chrome:' : isIOS ? 'For iPhone/iPad:' : 'Enable Manually:'}
       </h3>
       <ol className="space-y-2">
         {steps.map(({ step, text }) => (
           <li key={step} className="flex items-start gap-2 text-xs text-muted-foreground">
             <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">
               {step}
             </span>
             <span className="pt-0.5">{text}</span>
           </li>
         ))}
       </ol>
     </motion.div>
   );
 }