/**
 * Book & Page Turn Audio Engine (Zero-Latency Web Audio API)
 * 
 * Manages audio sound effects perfectly synchronized with page turns and book actions:
 * - /public/audio/page-turn/page-turn-01.mp3 (Page turn sound)
 * - /public/audio/page-flip/flip-01.mp3      (Fast page flip sound)
 * - /public/audio/book/book-open.mp3          (Book open sound)
 * - /public/audio/book/book-close.mp3         (Book close sound)
 */

export const PAGE_TURN_AUDIO_FILES: string[] = [
  '/audio/page-turn/page-turn-01.mp3',
];

export const PAGE_FLIP_AUDIO_FILES: string[] = [
  '/audio/page-flip/flip-01.mp3',
];

export const BOOK_AUDIO_FILES = {
  open: '/audio/book/book-open.mp3',
  close: '/audio/book/book-close.mp3',
};

// Web Audio API Context and Decoded Audio Buffers for Zero-Latency Playback
let audioCtx: AudioContext | null = null;
const audioBuffers: Map<string, AudioBuffer> = new Map();
const audioPool: Map<string, HTMLAudioElement[]> = new Map();
const POOL_SIZE = 4;

let lastPlayTimestamp = 0;
let isAudioPreloaded = false;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

/**
 * Preload all configured audio tracks into Web Audio API buffers for instant zero-latency playback
 */
export function initPaperAudio() {
  if (typeof window === 'undefined' || isAudioPreloaded) return;

  const ctx = getAudioContext();

  const unlock = () => {
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {});
    }
  };
  window.addEventListener('pointerdown', unlock, { once: true });
  window.addEventListener('keydown', unlock, { once: true });
  window.addEventListener('touchstart', unlock, { once: true });

  const allTracks = [
    ...PAGE_TURN_AUDIO_FILES,
    ...PAGE_FLIP_AUDIO_FILES,
    BOOK_AUDIO_FILES.open,
    BOOK_AUDIO_FILES.close,
  ];

  allTracks.forEach(async (src) => {
    // Populate HTML Audio Pool as immediate fallback
    const trackPool: HTMLAudioElement[] = [];
    for (let i = 0; i < POOL_SIZE; i++) {
      const audio = new Audio();
      audio.src = src;
      audio.preload = 'auto';
      audio.volume = 0.85;
      audio.onerror = () => {};
      trackPool.push(audio);
    }
    audioPool.set(src, trackPool);

    // Decode into Web Audio API buffer for zero latency
    try {
      const response = await fetch(src);
      const arrayBuffer = await response.arrayBuffer();
      if (ctx) {
        const decoded = await ctx.decodeAudioData(arrayBuffer);
        audioBuffers.set(src, decoded);
      }
    } catch {
      // Graceful fallback to pool
    }
  });

  isAudioPreloaded = true;
}

/**
 * Plays a sound effect with zero latency using Web Audio API buffer source
 */
function playTrackZeroLatency(targetSrc: string, volume = 0.85) {
  if (typeof window === 'undefined') return;
  if (!isAudioPreloaded) initPaperAudio();

  const ctx = getAudioContext();
  const buffer = audioBuffers.get(targetSrc);

  if (ctx && buffer) {
    try {
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      const gainNode = ctx.createGain();
      gainNode.gain.value = Math.max(0, Math.min(1, volume));
      source.connect(gainNode);
      gainNode.connect(ctx.destination);
      source.start(0); // Synchronous zero-delay playback
      return;
    } catch (e) {
      // Fallback below
    }
  }

  // HTMLAudioElement pool fallback
  const pool = audioPool.get(targetSrc);
  if (pool) {
    const audio = pool.find((a) => a.paused || a.ended) || pool[0];
    if (audio) {
      audio.currentTime = 0;
      audio.volume = Math.max(0, Math.min(1, volume));
      audio.play().catch(() => {});
    }
  }
}

/**
 * 1. Play Soft Page Turn (/public/audio/page-turn/page-turn-01.mp3)
 */
export function playRealisticPageTurn(volume = 0.85) {
  const now = Date.now();
  if (now - lastPlayTimestamp < 40) return; // Reduced debounce for instant feedback
  lastPlayTimestamp = now;

  playTrackZeroLatency(PAGE_TURN_AUDIO_FILES[0], volume);
}

/**
 * 2. Play Page Flip Swipe (/public/audio/page-flip/flip-01.mp3)
 */
export function playPageFlipSound(volume = 0.85) {
  const now = Date.now();
  if (now - lastPlayTimestamp < 40) return;
  lastPlayTimestamp = now;

  playTrackZeroLatency(PAGE_FLIP_AUDIO_FILES[0], volume);
}

/**
 * 3. Play Book Open (/public/audio/book/book-open.mp3)
 */
export function playBookOpenSound(volume = 0.85) {
  playTrackZeroLatency(BOOK_AUDIO_FILES.open, volume);
}

/**
 * 4. Play Book Close (/public/audio/book/book-close.mp3)
 */
export function playBookCloseSound(volume = 0.85) {
  playTrackZeroLatency(BOOK_AUDIO_FILES.close, volume);
}
