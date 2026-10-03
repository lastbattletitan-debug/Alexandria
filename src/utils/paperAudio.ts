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
  '/audio/page-turn/page-turn-01.MP3',
  '/audio/page-turn/page-turn-01.wav',
];

export const PAGE_FLIP_AUDIO_FILES: string[] = [
  '/audio/page-flip/flip-01.mp3',
  '/audio/page-flip/flip-01.MP3',
  '/audio/page-flip/flip-01.wav',
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
function playTrackZeroLatency(targetSrc: string, volume = 0.85): boolean {
  if (typeof window === 'undefined') return false;
  if (!isAudioPreloaded) initPaperAudio();

  const ctx = getAudioContext();
  const buffer = audioBuffers.get(targetSrc);

  if (ctx && buffer) {
    try {
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      const gainNode = ctx.createGain();
      gainNode.gain.value = Math.max(0, Math.min(1, volume));
      source.connect(gainNode);
      gainNode.connect(ctx.destination);
      source.start(0); // Synchronous zero-delay playback
      return true;
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
      return true;
    }
  }

  return false;
}

let noiseBuffer: AudioBuffer | null = null;

function getPaperSwishBuffer(ctx: AudioContext): AudioBuffer {
  if (noiseBuffer && noiseBuffer.sampleRate === ctx.sampleRate) {
    return noiseBuffer;
  }
  const duration = 0.16; // 160ms paper slide sound
  const bufferSize = ctx.sampleRate * duration;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);

  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
  for (let i = 0; i < bufferSize; i++) {
    const white = Math.random() * 2 - 1;
    // Pink noise filter algorithm for realistic soft paper texture
    b0 = 0.99886 * b0 + white * 0.0555179;
    b1 = 0.99332 * b1 + white * 0.0750759;
    b2 = 0.96900 * b2 + white * 0.1538520;
    b3 = 0.86650 * b3 + white * 0.3104856;
    b4 = 0.55000 * b4 + white * 0.5329522;
    b5 = -0.7616 * b5 - white * 0.0168980;
    const pink = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
    b6 = white * 0.115926;
    data[i] = (pink / 11) * Math.sin((i / bufferSize) * Math.PI);
  }
  noiseBuffer = buffer;
  return buffer;
}

/**
 * Plays a synthesized paper swish audio effect with guaranteed 0ms latency
 */
export function playInstantSyntheticPaperSwish(volume = 0.85) {
  const ctx = getAudioContext();
  if (!ctx) return;
  try {
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const swishBuffer = getPaperSwishBuffer(ctx);
    const source = ctx.createBufferSource();
    source.buffer = swishBuffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1300, ctx.currentTime);
    filter.Q.setValueAtTime(1.1, ctx.currentTime);

    const gain = ctx.createGain();
    const now = ctx.currentTime;
    gain.gain.setValueAtTime(0.01, now);
    gain.gain.linearRampToValueAtTime(volume * 0.35, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    source.start(now);
  } catch (e) {
    // Fallback
  }
}

/**
 * 1. Play Soft Page Turn (/public/audio/page-turn/page-turn-01.mp3)
 */
export function playRealisticPageTurn(volume = 0.85) {
  const now = Date.now();
  if (now - lastPlayTimestamp < 120) return; // Prevent rapid duplicate triggers
  lastPlayTimestamp = now;

  // Play pre-decoded high-fidelity MP3 sample or fallback to synthetic paper swish
  let played = false;
  for (const src of PAGE_TURN_AUDIO_FILES) {
    if (playTrackZeroLatency(src, volume)) {
      played = true;
      break;
    }
  }

  if (!played) {
    playInstantSyntheticPaperSwish(volume);
  }
}

/**
 * 2. Play Page Flip Swipe (/public/audio/page-flip/flip-01.mp3)
 */
export function playPageFlipSound(volume = 0.85) {
  const now = Date.now();
  if (now - lastPlayTimestamp < 40) return;
  lastPlayTimestamp = now;

  for (const src of PAGE_FLIP_AUDIO_FILES) {
    if (playTrackZeroLatency(src, volume)) {
      break;
    }
  }
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
