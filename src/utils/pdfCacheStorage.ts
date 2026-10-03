/**
 * Cache for high-resolution rendered PDF page JPEG blobs to prevent 
 * re-rendering when closing/reopening books or refreshing the page.
 */

const DB_NAME = 'AlexandriaRenderedPagesCacheV2';
const STORE_NAME = 'rendered_pages';
const DB_VERSION = 2;

export interface CachedRender {
  urls: string[];
  blobs: Blob[];
  aspectRatio: number;
}

// Global in-memory cache for ultra-fast instant 0ms access during app session
const inMemoryCache = new Map<string, CachedRender>();

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event: any) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
  });
}

/**
 * Get cached rendered pages from in-memory cache
 */
export function getMemoryCachedPages(cacheKey: string): CachedRender | undefined {
  return inMemoryCache.get(cacheKey);
}

/**
 * Get cached rendered pages from IndexedDB (persisted across page reloads/browser restarts)
 */
export async function getDbCachedPages(cacheKey: string): Promise<CachedRender | null> {
  if (inMemoryCache.has(cacheKey)) {
    return inMemoryCache.get(cacheKey)!;
  }

  try {
    const db = await openDatabase();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.get(cacheKey);

    const record = await new Promise<any>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });

    if (record && Array.isArray(record.blobs) && record.blobs.length > 0) {
      const urls = record.blobs.map((blob: Blob) => URL.createObjectURL(blob));
      const cached: CachedRender = {
        urls,
        blobs: record.blobs,
        aspectRatio: record.aspectRatio || 0.714
      };
      inMemoryCache.set(cacheKey, cached);
      return cached;
    }
  } catch (err) {
    console.warn('Error reading rendered PDF pages from IndexedDB:', err);
  }

  return null;
}

/**
 * Save rendered page blobs and aspect ratio to in-memory and IndexedDB cache
 */
export async function saveCachedPages(
  cacheKey: string,
  blobs: Blob[],
  aspectRatio: number
): Promise<CachedRender> {
  // Reuse existing or create Object URLs
  const existing = inMemoryCache.get(cacheKey);
  const urls = blobs.map((blob, idx) => {
    if (existing && existing.urls[idx] && existing.blobs[idx] === blob) {
      return existing.urls[idx];
    }
    return URL.createObjectURL(blob);
  });

  const cached: CachedRender = { urls, blobs, aspectRatio };
  inMemoryCache.set(cacheKey, cached);

  // Save to IndexedDB asynchronously
  try {
    const db = await openDatabase();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.put({ cacheKey, blobs, aspectRatio, timestamp: Date.now() }, cacheKey);
  } catch (err) {
    console.warn('Error saving rendered PDF pages to IndexedDB:', err);
  }

  return cached;
}

/**
 * Invalidate cache if a book PDF is replaced/re-uploaded
 */
export async function clearCachedPages(cacheKey: string): Promise<void> {
  const cached = inMemoryCache.get(cacheKey);
  if (cached) {
    cached.urls.forEach(url => URL.revokeObjectURL(url));
    inMemoryCache.delete(cacheKey);
  }

  try {
    const db = await openDatabase();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.delete(cacheKey);
  } catch (err) {
    console.warn('Error clearing rendered PDF cache from IndexedDB:', err);
  }
}
