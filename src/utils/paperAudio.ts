/**
 * Book & Page Turn Audio Engine
 * 
 * Manages real audio sound effects organized in /public/audio/:
 * - /public/audio/page-turn/  (paper-light-01.mp3 ... paper-light-05.mp3)
 * - /public/audio/page-flip/  (flip-01.mp3 ... flip-03.mp3)
 * - /public/audio/book/       (book-open.mp3, book-close.mp3)
 */

// 1. Page Turn (Soft / Normal page turning)
export const PAGE_TURN_AUDIO_FILES: string[] = [
  '/audio/page-turn/page-turn-01.mp3',
  '/audio/page-turn/page-turn-02.mp3',
  '/audio/page-turn/page-turn-03.mp3',
  '/audio/page-turn/paper-light-01.mp3',
  '/audio/page-turn/paper-light-02.mp3',
];

// 2. Page Flip (Fast flip / swipe drag)
export const PAGE_FLIP_AUDIO_FILES: string[] = [
  '/audio/page-flip/flip-01.mp3',
  '/audio/page-flip/flip-02.mp3',
  '/audio/page-flip/flip-03.mp3',
];

// 3. Book Open & Close
export const BOOK_AUDIO_FILES = {
  open: '/audio/book/book-open.mp3',
  close: '/audio/book/book-close.mp3',
};

// Audio pool to allow seamless overlapping playback
const audioPool: HTMLAudioElement[] = [];
const POOL_SIZE_PER_TRACK = 2;

let lastTurnIndex = -1;
let lastFlipIndex = -1;
let lastPlayTimestamp = 0;
let isAudioPreloaded = false;

/**
 * Preload all configured audio tracks for instant zero-latency playback
 */
export function initPaperAudio() {
  if (typeof window === 'undefined' || isAudioPreloaded) return;

  try {
    const allTracks = [
      ...PAGE_TURN_AUDIO_FILES,
      ...PAGE_FLIP_AUDIO_FILES,
      BOOK_AUDIO_FILES.open,
      BOOK_AUDIO_FILES.close,
    ];

    allTracks.forEach((src) => {
      for (let i = 0; i < POOL_SIZE_PER_TRACK; i++) {
        const audio = new Audio();
        audio.src = src;
        audio.preload = 'auto';
        audio.volume = 0.85;
        // Silent error handler if real files are not yet uploaded
        audio.onerror = () => {};
        audioPool.push(audio);
      }
    });

    isAudioPreloaded = true;
  } catch {
    // Graceful silent initialization
  }
}

/**
 * Helper to get an available audio element from the pool or instantiate one
 */
function getAudioFromPool(targetSrc: string): HTMLAudioElement | null {
  const candidate = audioPool.find((a) => a.src.endsWith(targetSrc) && (a.paused || a.ended));
  if (candidate) {
    return candidate;
  }
  try {
    const freshAudio = new Audio(targetSrc);
    freshAudio.preload = 'auto';
    freshAudio.onerror = () => {};
    return freshAudio;
  } catch {
    return null;
  }
}

/**
 * Helper to pick next track avoiding repeating the exact same index consecutively
 */
function pickNextTrack(files: string[], getLastIndex: () => number, setLastIndex: (idx: number) => void): HTMLAudioElement | null {
  if (files.length === 0) return null;

  let nextIndex: number;
  if (files.length === 1) {
    nextIndex = 0;
  } else {
    const last = getLastIndex();
    do {
      nextIndex = Math.floor(Math.random() * files.length);
    } while (nextIndex === last);
  }

  setLastIndex(nextIndex);
  return getAudioFromPool(files[nextIndex]);
}

/**
 * Plays a single audio element with volume and organic pitch variation
 */
function playAudioTrack(audio: HTMLAudioElement | null, volume = 0.85, pitchVariation = 0.08) {
  if (!audio) return;
  try {
    audio.currentTime = 0;
    audio.volume = Math.max(0, Math.min(1, volume));
    audio.playbackRate = 0.96 + Math.random() * pitchVariation;
    const p = audio.play();
    if (p !== undefined) {
      p.catch(() => {});
    }
  } catch {}
}

/**
 * 1. Play Soft Page Turn (/public/audio/page-turn/paper-light-0X.mp3)
 */
export function playRealisticPageTurn(volume = 0.85) {
  if (typeof window === 'undefined') return;

  const now = Date.now();
  if (now - lastPlayTimestamp < 120) return;
  lastPlayTimestamp = now;

  if (!isAudioPreloaded) initPaperAudio();

  const track = pickNextTrack(
    PAGE_TURN_AUDIO_FILES, 
    () => lastTurnIndex, 
    (idx) => { lastTurnIndex = idx; }
  );

  playAudioTrack(track, volume, 0.06);
}

/**
 * 2. Play Page Flip Swipe (/public/audio/page-flip/flip-0X.mp3)
 */
export function playPageFlipSound(volume = 0.85) {
  if (typeof window === 'undefined') return;

  const now = Date.now();
  if (now - lastPlayTimestamp < 120) return;
  lastPlayTimestamp = now;

  if (!isAudioPreloaded) initPaperAudio();

  const track = pickNextTrack(
    PAGE_FLIP_AUDIO_FILES, 
    () => lastFlipIndex, 
    (idx) => { lastFlipIndex = idx; }
  );

  playAudioTrack(track, volume, 0.08);
}

/**
 * 3. Play Book Open (/public/audio/book/book-open.mp3)
 */
export function playBookOpenSound(volume = 0.85) {
  if (typeof window === 'undefined') return;
  if (!isAudioPreloaded) initPaperAudio();
  const track = getAudioFromPool(BOOK_AUDIO_FILES.open);
  playAudioTrack(track, volume, 0.02);
}

/**
 * 4. Play Book Close (/public/audio/book/book-close.mp3)
 */
export function playBookCloseSound(volume = 0.85) {
  if (typeof window === 'undefined') return;
  if (!isAudioPreloaded) initPaperAudio();
  const track = getAudioFromPool(BOOK_AUDIO_FILES.close);
  playAudioTrack(track, volume, 0.02);
}
