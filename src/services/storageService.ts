/**
 * Asset and local storage helper service.
 * Free/Starter Tier compliant: Exclusively uses local project assets (/public)
 * and client-side data URLs for user uploads. NO Firebase Cloud Storage.
 */

import { savePdfFile, getPdfFile } from '../utils/pdfStorage';

// In-memory cache for fast URL resolution
const urlCache = new Map<string, string>();

/**
 * Handles a book's main content file (MD, PDF, TXT, etc.)
 * Returns the URL/content and metadata without calling Cloud Storage.
 */
export async function uploadBookContent(
  bookId: string,
  file: Blob | File,
  extension: string = 'md'
): Promise<{ storagePath: string; downloadUrl: string; textContent?: string }> {
  const cleanExt = extension.replace(/^\./, '').toLowerCase();

  // If it's markdown or text, read it directly as text
  if (cleanExt === 'md' || cleanExt === 'txt' || file.type.includes('markdown') || file.type.includes('text')) {
    const textContent = await (file as File).text();
    const blob = new Blob([textContent], { type: 'text/markdown;charset=utf-8' });
    const localUrl = URL.createObjectURL(blob);
    return {
      storagePath: '',
      downloadUrl: localUrl,
      textContent
    };
  }

  // For PDF or binary files, save to persistent IndexedDB
  if (cleanExt === 'pdf' || file.type === 'application/pdf') {
    await savePdfFile(bookId, file);
    const localUrl = URL.createObjectURL(file);
    return {
      storagePath: `indexeddb:${bookId}`,
      downloadUrl: localUrl
    };
  }

  // Fallback for other files
  const localUrl = URL.createObjectURL(file);
  return {
    storagePath: localUrl,
    downloadUrl: localUrl
  };
}

/**
 * Converts an image file to a compressed Base64 data URL for direct Firestore / local storage
 */
export async function uploadBookImage(
  bookId: string,
  file: Blob | File,
  filename: string = 'cover.webp'
): Promise<{ storagePath: string; downloadUrl: string }> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = (e.target?.result as string) || '';
      resolve({
        storagePath: dataUrl,
        downloadUrl: dataUrl
      });
    };
    reader.onerror = () => {
      resolve({
        storagePath: '/covers/alexandria-codex.svg',
        downloadUrl: '/covers/alexandria-codex.svg'
      });
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Resizes avatar to compact Base64 (~150x150) for direct Firestore storage
 */
export async function uploadProfileAvatar(
  file: File | Blob
): Promise<{ storagePath: string; downloadUrl: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_DIM = 200;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_DIM) {
            height = Math.round((height * MAX_DIM) / width);
            width = MAX_DIM;
          }
        } else {
          if (height > MAX_DIM) {
            width = Math.round((width * MAX_DIM) / height);
            height = MAX_DIM;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.85);
          resolve({
            storagePath: compressedDataUrl,
            downloadUrl: compressedDataUrl
          });
          return;
        }
        const rawData = event.target?.result as string;
        resolve({ storagePath: rawData, downloadUrl: rawData });
      };
      img.onerror = () => {
        const rawData = event.target?.result as string;
        resolve({ storagePath: rawData, downloadUrl: rawData });
      };
      img.src = event.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Resolves an asset URL (public asset path /books/*, /covers/*, or data URL / blob)
 */
export async function getStorageUrl(storagePath: string): Promise<string> {
  if (!storagePath) return '';

  if (storagePath.startsWith('indexeddb:')) {
    const bookId = storagePath.replace('indexeddb:', '');
    const blob = await getPdfFile(bookId);
    if (blob) {
      return URL.createObjectURL(blob);
    }
    return '';
  }

  // Already a full or static URL
  if (
    storagePath.startsWith('/') ||
    storagePath.startsWith('http://') ||
    storagePath.startsWith('https://') ||
    storagePath.startsWith('data:')
  ) {
    return storagePath;
  }

  if (urlCache.has(storagePath)) {
    return urlCache.get(storagePath)!;
  }

  return storagePath;
}

/**
 * Downloads / fetches text for a given path (static public asset or data URL)
 */
export async function downloadStorageText(storagePath: string): Promise<string> {
  const url = await getStorageUrl(storagePath);
  if (!url) {
    throw new Error(`Invalid asset path: ${storagePath}`);
  }

  // If it's a data URL containing text
  if (url.startsWith('data:text/')) {
    const base64Part = url.split(',')[1];
    return atob(base64Part);
  }

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch text from ${url} (${res.status})`);
  }
  return await res.text();
}

/**
 * Downloads / fetches blob for a given path
 */
export async function downloadStorageBlob(storagePath: string): Promise<Blob> {
  const url = await getStorageUrl(storagePath);
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch blob from ${url} (${res.status})`);
  }
  return await res.blob();
}

/**
 * Safe no-op delete (no Cloud Storage to call)
 */
export async function deleteStoragePath(storagePath: string): Promise<void> {
  if (storagePath && storagePath.startsWith('blob:')) {
    try {
      URL.revokeObjectURL(storagePath);
    } catch (e) {}
  }
}
