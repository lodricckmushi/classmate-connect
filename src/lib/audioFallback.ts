// Audio fallback for when Web Speech API is not available
// Uses Web Audio API to create distinctive notification sounds

export interface AudioOptions {
  volume?: number;
  urgency?: 'low' | 'medium' | 'high';
}

// Create audio context lazily
let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (!audioContext) {
    try {
      audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch (e) {
      console.warn('Web Audio API not supported');
      return null;
    }
  }
  return audioContext;
}

// Play a single tone
function playTone(
  context: AudioContext,
  frequency: number,
  duration: number,
  startTime: number,
  volume: number = 0.3
): void {
  const oscillator = context.createOscillator();
  const gainNode = context.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(context.destination);

  oscillator.frequency.value = frequency;
  oscillator.type = 'sine';

  // Smooth attack and release
  gainNode.gain.setValueAtTime(0, startTime);
  gainNode.gain.linearRampToValueAtTime(volume, startTime + 0.02);
  gainNode.gain.setValueAtTime(volume, startTime + duration - 0.05);
  gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);

  oscillator.start(startTime);
  oscillator.stop(startTime + duration);
}

// Play attention-grabbing pattern (used when speech synthesis unavailable)
export function playReminderSound(options: AudioOptions = {}): Promise<void> {
  return new Promise((resolve) => {
    const context = getAudioContext();
    if (!context) {
      resolve();
      return;
    }

    // Resume context if suspended (required by browsers)
    if (context.state === 'suspended') {
      context.resume();
    }

    const { volume = 0.4, urgency = 'medium' } = options;
    const now = context.currentTime;

    // Different patterns based on urgency
    const patterns = {
      low: [
        { freq: 523, duration: 0.15 }, // C5
        { freq: 659, duration: 0.2 },  // E5
      ],
      medium: [
        { freq: 523, duration: 0.12 }, // C5
        { freq: 659, duration: 0.12 }, // E5
        { freq: 784, duration: 0.2 },  // G5
        { freq: 659, duration: 0.12 }, // E5
        { freq: 784, duration: 0.25 }, // G5
      ],
      high: [
        { freq: 784, duration: 0.1 },  // G5
        { freq: 988, duration: 0.1 },  // B5
        { freq: 1047, duration: 0.15 }, // C6
        { freq: 784, duration: 0.1 },  // G5
        { freq: 988, duration: 0.1 },  // B5
        { freq: 1047, duration: 0.2 }, // C6
        { freq: 988, duration: 0.1 },  // B5
        { freq: 1047, duration: 0.3 }, // C6 (long)
      ],
    };

    const pattern = patterns[urgency];
    let currentTime = now;

    pattern.forEach((note, index) => {
      playTone(context, note.freq, note.duration, currentTime, volume);
      currentTime += note.duration + 0.05; // Small gap between notes
    });

    // Resolve after pattern completes
    const totalDuration = pattern.reduce((sum, n) => sum + n.duration + 0.05, 0);
    setTimeout(resolve, totalDuration * 1000);
  });
}

// Play a simple notification beep
export function playNotificationBeep(volume: number = 0.3): void {
  const context = getAudioContext();
  if (!context) return;

  if (context.state === 'suspended') {
    context.resume();
  }

  const now = context.currentTime;
  
  // Two-tone pleasant beep
  playTone(context, 880, 0.15, now, volume);        // A5
  playTone(context, 1109, 0.2, now + 0.18, volume); // C#6
}

// Morse-code style pattern for class name (accessibility feature)
export function playMorsePattern(text: string, volume: number = 0.3): Promise<void> {
  return new Promise((resolve) => {
    const context = getAudioContext();
    if (!context) {
      resolve();
      return;
    }

    if (context.state === 'suspended') {
      context.resume();
    }

    // Simplified: just play unique pattern based on first letter
    const firstChar = text.charAt(0).toUpperCase();
    const charCode = firstChar.charCodeAt(0) - 65; // A=0, B=1, etc.
    const baseFreq = 600 + (charCode * 30); // Different pitch per letter

    const now = context.currentTime;
    
    // Play 3-note pattern
    playTone(context, baseFreq, 0.1, now, volume);
    playTone(context, baseFreq + 100, 0.1, now + 0.15, volume);
    playTone(context, baseFreq + 200, 0.15, now + 0.3, volume);

    setTimeout(resolve, 500);
  });
}

// Generate a more human-friendly reminder message
export function humanizeReminderText(
  eventTitle: string,
  minutesBefore: number,
  location?: string
): string {
  const greetings = [
    "Hey there! Just a quick heads up",
    "Hi! Friendly reminder",
    "Hello! Don't forget",
    "Quick reminder for you",
  ];
  const greeting = greetings[Math.floor(Math.random() * greetings.length)];
  
  let timePhrase: string;
  if (minutesBefore === 1) {
    timePhrase = "in just 1 minute";
  } else if (minutesBefore <= 5) {
    timePhrase = `in about ${minutesBefore} minutes`;
  } else if (minutesBefore === 10) {
    timePhrase = "in 10 minutes";
  } else if (minutesBefore === 15) {
    timePhrase = "in about 15 minutes";
  } else if (minutesBefore === 30) {
    timePhrase = "in half an hour";
  } else if (minutesBefore === 60) {
    timePhrase = "in about an hour";
  } else {
    timePhrase = `in ${minutesBefore} minutes`;
  }
  
  let message = `${greeting}! ${eventTitle} is starting ${timePhrase}`;
  
  if (location) {
    message += `. Head over to ${location}`;
  }
  
  message += ". You've got this!";
  
  return message;
}

// Speak using fallback audio when TTS unavailable
export async function speakWithFallback(
  text: string,
  volume: number = 1,
  rate: number = 0.9 // Slightly slower for clarity
): Promise<void> {
  // Try Web Speech API first
  if ('speechSynthesis' in window) {
    try {
      return await new Promise((resolve, reject) => {
        // Cancel any ongoing speech
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.volume = volume;
        utterance.rate = rate;
        utterance.pitch = 1.05; // Slightly higher for friendlier tone

        // Try to use a natural voice
        const voices = window.speechSynthesis.getVoices();
        const preferredVoice = voices.find(v =>
          v.lang.startsWith('en') && (
            v.name.includes('Natural') || 
            v.name.includes('Google') ||
            v.name.includes('Samantha') ||
            v.name.includes('Karen')
          )
        ) || voices.find(v => v.lang.startsWith('en'));

        if (preferredVoice) {
          utterance.voice = preferredVoice;
        }

        let resolved = false;
        
        utterance.onend = () => {
          if (!resolved) {
            resolved = true;
            resolve();
          }
        };
        
        utterance.onerror = (e) => {
          if (!resolved) {
            resolved = true;
            reject(e);
          }
        };

        // Timeout fallback (some browsers hang)
        setTimeout(() => {
          if (!resolved) {
            resolved = true;
            window.speechSynthesis.cancel();
            reject(new Error('Speech timeout'));
          }
        }, 15000);

        window.speechSynthesis.speak(utterance);
      });
    } catch (e) {
      console.warn('Speech synthesis failed, using audio fallback:', e);
    }
  }

  // Fallback: Play distinctive sound pattern
  console.log('Using audio fallback for reminder');
  await playReminderSound({ volume, urgency: 'high' });
}

// Check if speech synthesis is available and working
export async function checkSpeechSupport(): Promise<boolean> {
  if (!('speechSynthesis' in window)) {
    return false;
  }

  // Test if it actually works
  return new Promise((resolve) => {
    const utterance = new SpeechSynthesisUtterance('');
    utterance.volume = 0;
    
    utterance.onend = () => resolve(true);
    utterance.onerror = () => resolve(false);
    
    // Timeout
    setTimeout(() => resolve(false), 1000);
    
    try {
      window.speechSynthesis.speak(utterance);
    } catch {
      resolve(false);
    }
  });
}
