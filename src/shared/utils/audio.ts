let globalAudioCtx: AudioContext | null = null;

/**
 * Initialize audio context for notifications
 */
export const initAudioContext = (): AudioContext | null => {
  if (!globalAudioCtx) {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContext) {
      globalAudioCtx = new AudioContext();
    }
  }
  if (globalAudioCtx && globalAudioCtx.state === 'suspended') {
    globalAudioCtx.resume();
  }
  return globalAudioCtx;
};

/**
 * Play a synthesized beep sound as fallback
 */
export const playSynthesizedBeep = (): void => {
  try {
    const ctx = initAudioContext();
    if (!ctx) return;

    const playTone = (freq: number, startTime: number, duration: number, type: OscillatorType = 'sine') => {
      const osc = ctx!.createOscillator();
      const gain = ctx!.createGain();
      osc.connect(gain);
      gain.connect(ctx!.destination);
      osc.type = type;
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.3, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
      osc.start(startTime);
      osc.stop(startTime + duration);
    };

    const now = ctx.currentTime;
    playTone(880, now, 0.2, 'triangle');
    playTone(587.33, now + 0.25, 0.4, 'sine');
    playTone(880, now + 0.7, 0.2, 'triangle');
  } catch (error) {
    console.warn("Erro ao reproduzir beep:", error);
  }
};

/**
 * Play notification sound (tries audio file, falls back to beep)
 */
export const playNotificationSound = (): void => {
  const audio = new Audio('/audio/hey_listen.mp3');
  const playPromise = audio.play();
  if (playPromise !== undefined) {
    playPromise.catch(() => {
      playSynthesizedBeep();
    });
  }
};
