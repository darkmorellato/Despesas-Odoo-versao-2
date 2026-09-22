let globalAudioCtx: AudioContext | null = null;
let cachedCalendarAudio: HTMLAudioElement | null = null;
let cachedTodoAudio: HTMLAudioElement | null = null;
let lastAudioPlayTime = 0;
// Timers de fila SEPARADOS por tipo — assim um toque pendente do calendário
// não é cancelado pelo de tarefas (e vice-versa).
let calendarQueueTimeout: ReturnType<typeof setTimeout> | null = null;
let todoQueueTimeout: ReturnType<typeof setTimeout> | null = null;

/**
 * Initialize audio context for notifications
 */
export const initAudioContext = (): AudioContext | null => {
  if (!globalAudioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      globalAudioCtx = new AudioContextClass();
    }
  }
  if (globalAudioCtx && globalAudioCtx.state === 'suspended') {
    globalAudioCtx.resume().catch(() => {});
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
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = type;
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.3, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
      osc.start(startTime);
      osc.stop(startTime + duration);
    };

    const now = ctx.currentTime;
    playTone(880, now, 0.15, 'triangle');
    playTone(587.33, now + 0.2, 0.3, 'sine');
    playTone(880, now + 0.55, 0.2, 'triangle');
  } catch (error) {
    console.warn('Erro ao reproduzir beep:', error);
  }
};

/**
 * Plays calendar alert sound (hey_listen.mp3)
 */
export const playCalendarAlertSound = (): void => {
  const now = Date.now();
  // Limiar anti-sobreposição real: 3000 ms — se tocou há menos de 3 s,
  // agenda nova tentativa 3,5 s depois (timer próprio do calendário)
  if (now - lastAudioPlayTime < 3000) {
    if (calendarQueueTimeout) clearTimeout(calendarQueueTimeout);
    calendarQueueTimeout = setTimeout(() => {
      calendarQueueTimeout = null;
      playCalendarAlertSound();
    }, 3500);
    return;
  }

  try {
    lastAudioPlayTime = Date.now();
    if (!cachedCalendarAudio) {
      cachedCalendarAudio = new Audio('./audio/hey_listen.mp3');
    }
    cachedCalendarAudio.currentTime = 0;
    const playPromise = cachedCalendarAudio.play();
    if (playPromise !== undefined) {
      playPromise.catch(() => {
        playSynthesizedBeep();
      });
    }
  } catch {
    playSynthesizedBeep();
  }
};

/**
 * Plays To-Do alert sound (todo.mp3)
 */
export const playTodoAlertSound = (): void => {
  const now = Date.now();
  // Limiar anti-sobreposição real: 3000 ms — se tocou há menos de 3 s,
  // agenda nova tentativa 3,5 s depois (timer próprio de tarefas)
  if (now - lastAudioPlayTime < 3000) {
    if (todoQueueTimeout) clearTimeout(todoQueueTimeout);
    todoQueueTimeout = setTimeout(() => {
      todoQueueTimeout = null;
      playTodoAlertSound();
    }, 3500);
    return;
  }

  try {
    lastAudioPlayTime = Date.now();
    if (!cachedTodoAudio) {
      cachedTodoAudio = new Audio('./audio/todo.mp3');
    }
    cachedTodoAudio.currentTime = 0;
    const playPromise = cachedTodoAudio.play();
    if (playPromise !== undefined) {
      playPromise.catch(() => {
        playSynthesizedBeep();
      });
    }
  } catch {
    playSynthesizedBeep();
  }
};

/**
 * Play notification sound (routes to calendar or todo)
 */
export const playNotificationSound = (type: 'calendar' | 'todo' = 'calendar'): void => {
  if (type === 'todo') {
    playTodoAlertSound();
  } else {
    playCalendarAlertSound();
  }
};
