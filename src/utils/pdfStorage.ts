/**
 * IndexedDB storage for large uploaded PDF files to persist across sessions
 */

const DB_NAME = 'AlexandriaPDFStorage';
const STORE_NAME = 'pdf_files';
const DB_VERSION = 1;

export function openPDFDatabase(): Promise<IDBDatabase> {
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

export async function savePdfFile(bookId: string, file: Blob): Promise<void> {
  try {
    const db = await openPDFDatabase();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.put(file, bookId);
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.error('Error saving PDF to IndexedDB:', err);
  }
}

export async function getPdfFile(bookId: string): Promise<Blob | null> {
  try {
    const db = await openPDFDatabase();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.get(bookId);
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.error('Error getting PDF from IndexedDB:', err);
    return null;
  }
}
