import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  writeBatch
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';
import { LibraryBook, BookNote, ProfileSettings } from '../types';

const BOOKS_COLLECTION = 'books';
const PROFILE_DOC = 'profile/settings';

// Single document safety threshold: 400KB (Firestore limit is 1MB)
const CHUNK_SIZE_LIMIT = 400 * 1024;

export interface BookChapter {
  id: string;
  bookId: string;
  title: string;
  order: number;
  content: string;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Splits a large Markdown text into smaller chapters/chunks to never exceed Firestore's 1MB document limit.
 */
export function splitMarkdownIntoChapters(
  markdown: string,
  bookTitle: string = 'Livro'
): { title: string; order: number; content: string }[] {
  if (!markdown || markdown.length <= CHUNK_SIZE_LIMIT) {
    return [
      {
        title: bookTitle,
        order: 0,
        content: markdown || '',
      }
    ];
  }

  // Split by markdown headings: # or ##
  const sections = markdown.split(/\n(?=#+ )/g);
  const chapters: { title: string; order: number; content: string }[] = [];
  let currentChunk = '';
  let currentTitle = `${bookTitle} - Parte 1`;
  let chapterIndex = 0;

  for (let i = 0; i < sections.length; i++) {
    const sec = sections[i];
    // Check heading title
    const match = sec.match(/^#+\s+(.+)/);
    const secTitle = match ? match[1].trim() : `${bookTitle} - Parte ${chapterIndex + 1}`;

    if ((currentChunk.length + sec.length) > CHUNK_SIZE_LIMIT && currentChunk.length > 0) {
      chapters.push({
        title: currentTitle,
        order: chapterIndex,
        content: currentChunk,
      });
      chapterIndex++;
      currentChunk = sec;
      currentTitle = secTitle;
    } else {
      if (!currentChunk) {
        currentTitle = secTitle;
      }
      currentChunk = currentChunk ? `${currentChunk}\n${sec}` : sec;
    }
  }

  if (currentChunk.length > 0) {
    chapters.push({
      title: currentTitle,
      order: chapterIndex,
      content: currentChunk,
    });
  }

  return chapters;
}

/**
 * Loads all books from Firestore ordered by readingOrder
 */
export async function getBooksFromFirestore(): Promise<LibraryBook[]> {
  try {
    const booksQuery = query(collection(db, BOOKS_COLLECTION), orderBy('readingOrder', 'asc'));
    const snapshot = await getDocs(booksQuery);
    
    return snapshot.docs.map((docSnap) => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        title: data.title || 'Sem título',
        author: data.author || 'Desconhecido',
        coverPath: data.coverPath || '',
        contentPath: data.contentPath || '',
        content: data.content || '',
        hasChapters: !!data.hasChapters,
        status: data.status || 'unread',
        currentPage: typeof data.currentPage === 'number' ? data.currentPage : 0,
        totalPages: typeof data.totalPages === 'number' ? data.totalPages : 1,
        progress: typeof data.progress === 'number' ? data.progress : 0,
        readingOrder: typeof data.readingOrder === 'number' ? data.readingOrder : 0,
        favorite: !!data.favorite,
        createdAt: data.createdAt || new Date().toISOString(),
        updatedAt: data.updatedAt || new Date().toISOString(),
        lastOpenedAt: data.lastOpenedAt || new Date().toISOString(),
        startedAt: data.startedAt || null,
        finishedAt: data.finishedAt || null,
        currentScrollPosition: data.currentScrollPosition || 0,
        lastOpenedChapter: data.lastOpenedChapter || '',
        readingTime: data.readingTime || 0,
        format: data.format || 'md',
        categories: Array.isArray(data.categories) ? data.categories : [],
        rating: typeof data.rating === 'number' ? data.rating : 0,
      } as LibraryBook;
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, BOOKS_COLLECTION);
    return [];
  }
}

/**
 * Saves a book's chapters subcollection in Firestore (books/{bookId}/chapters/{chapterId})
 */
export async function saveBookChapters(
  bookId: string,
  chapters: { title: string; order: number; content: string }[]
): Promise<void> {
  const batch = writeBatch(db);
  const now = new Date().toISOString();

  chapters.forEach((ch, idx) => {
    const chapterId = `chapter_${String(idx).padStart(3, '0')}`;
    const chapterDocRef = doc(db, BOOKS_COLLECTION, bookId, 'chapters', chapterId);
    batch.set(chapterDocRef, {
      title: ch.title,
      order: ch.order,
      content: ch.content,
      createdAt: now,
      updatedAt: now,
    });
  });

  try {
    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `${BOOKS_COLLECTION}/${bookId}/chapters`);
  }
}

/**
 * Retrieves all chapters for a book from Firestore ordered by 'order' asc
 */
export async function getBookChapters(bookId: string): Promise<BookChapter[]> {
  const chaptersPath = `${BOOKS_COLLECTION}/${bookId}/chapters`;
  try {
    const q = query(collection(db, BOOKS_COLLECTION, bookId, 'chapters'), orderBy('order', 'asc'));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({
      id: d.id,
      bookId,
      title: d.data().title || '',
      order: d.data().order || 0,
      content: d.data().content || '',
      createdAt: d.data().createdAt,
      updatedAt: d.data().updatedAt,
    }));
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, chaptersPath);
    return [];
  }
}

/**
 * Creates or updates a book document in Firestore with automatic chapter chunking for large content
 */
export async function saveBookToFirestore(
  book: LibraryBook,
  fullMarkdownContent?: string
): Promise<void> {
  const docRef = doc(db, BOOKS_COLLECTION, book.id);
  const now = new Date().toISOString();
  
  const contentToStore = fullMarkdownContent !== undefined ? fullMarkdownContent : (book.content || '');
  const needsChapters = contentToStore.length > CHUNK_SIZE_LIMIT;

  const payload: Record<string, any> = {
    title: book.title || 'Sem título',
    author: book.author || 'Desconhecido',
    coverPath: book.coverPath || '',
    contentPath: book.contentPath || '',
    hasChapters: needsChapters,
    status: book.status || 'unread',
    currentPage: Number(book.currentPage || 0),
    totalPages: Number(book.totalPages || 1),
    progress: Math.min(1.0, Math.max(0.0, Number(book.progress || 0))),
    readingOrder: Number(book.readingOrder || 0),
    favorite: !!book.favorite,
    createdAt: book.createdAt || now,
    updatedAt: now,
    lastOpenedAt: book.lastOpenedAt || now,
    startedAt: book.startedAt || null,
    finishedAt: book.finishedAt || null,
    currentScrollPosition: Number(book.currentScrollPosition || 0),
    lastOpenedChapter: book.lastOpenedChapter || '',
    readingTime: Number(book.readingTime || 0),
    format: book.format || 'md',
    categories: Array.isArray(book.categories) ? book.categories : [],
    rating: Number(book.rating || 0),
  };

  if (!needsChapters) {
    payload.content = contentToStore;
  } else {
    // Large book: content stored in chapters subcollection
    payload.content = contentToStore.slice(0, 5000); // brief preview
  }

  try {
    await setDoc(docRef, payload, { merge: true });

    // If large book, store chunks in chapters subcollection
    if (needsChapters) {
      const chapters = splitMarkdownIntoChapters(contentToStore, book.title);
      await saveBookChapters(book.id, chapters);
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `${BOOKS_COLLECTION}/${book.id}`);
  }
}

/**
 * Reconstructs and loads the full Markdown content of a book from Firestore
 */
export async function loadBookFullContent(book: LibraryBook): Promise<string> {
  // If book has chapters in subcollection, load and join them
  if (book.hasChapters) {
    try {
      const chapters = await getBookChapters(book.id);
      if (chapters.length > 0) {
        return chapters.map((ch) => ch.content).join('\n\n');
      }
    } catch (e) {
      console.warn('Failed to load chapters for book, checking inline content:', e);
    }
  }

  // If inline content is stored in document
  if (book.content) {
    return book.content;
  }

  // Fetch book doc to see if content exists remotely
  try {
    const docSnap = await getDoc(doc(db, BOOKS_COLLECTION, book.id));
    if (docSnap.exists()) {
      const data = docSnap.data();
      if (data.hasChapters) {
        const chapters = await getBookChapters(book.id);
        if (chapters.length > 0) {
          return chapters.map((ch) => ch.content).join('\n\n');
        }
      }
      if (data.content) {
        return data.content;
      }
    }
  } catch (e) {
    console.error('Error fetching book content from Firestore:', e);
  }

  return '';
}

/**
 * Updates partial book fields (e.g. status, rating, favorite, progress)
 */
export async function updateBookPartial(
  bookId: string,
  partial: Partial<LibraryBook>
): Promise<void> {
  const docRef = doc(db, BOOKS_COLLECTION, bookId);
  const payload: Record<string, any> = {
    ...partial,
    updatedAt: new Date().toISOString(),
  };

  // Ensure numeric constraints if present
  if (typeof payload.progress === 'number') {
    payload.progress = Math.min(1.0, Math.max(0.0, payload.progress));
  }

  try {
    await updateDoc(docRef, payload);
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `${BOOKS_COLLECTION}/${bookId}`);
  }
}

/**
 * Deletes a book and all its notes and chapters subcollections
 */
export async function deleteBookFromFirestore(bookId: string): Promise<void> {
  try {
    const batch = writeBatch(db);

    // Delete chapters
    const chaptersCol = collection(db, BOOKS_COLLECTION, bookId, 'chapters');
    const chaptersSnap = await getDocs(chaptersCol);
    chaptersSnap.docs.forEach((docSnap) => {
      batch.delete(docSnap.ref);
    });

    // Delete notes
    const notesCol = collection(db, BOOKS_COLLECTION, bookId, 'notes');
    const notesSnap = await getDocs(notesCol);
    notesSnap.docs.forEach((docSnap) => {
      batch.delete(docSnap.ref);
    });
    
    // Delete the book doc
    batch.delete(doc(db, BOOKS_COLLECTION, bookId));
    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `${BOOKS_COLLECTION}/${bookId}`);
  }
}

/**
 * Batch updates reading order across all books
 */
export async function updateBooksOrderInFirestore(
  orderedBookIds: string[]
): Promise<void> {
  if (!orderedBookIds.length) return;
  try {
    const batch = writeBatch(db);
    const now = new Date().toISOString();
    
    orderedBookIds.forEach((id, index) => {
      const docRef = doc(db, BOOKS_COLLECTION, id);
      batch.update(docRef, {
        readingOrder: index,
        updatedAt: now,
      });
    });
    
    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, BOOKS_COLLECTION);
  }
}

// ---------------- NOTES SUBCOLLECTION ---------------- //

/**
 * Fetches all notes for a specific book
 */
export async function getBookNotes(bookId: string): Promise<BookNote[]> {
  const notesPath = `${BOOKS_COLLECTION}/${bookId}/notes`;
  try {
    const q = query(collection(db, BOOKS_COLLECTION, bookId, 'notes'), orderBy('page', 'asc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => ({
      id: d.id,
      bookId,
      page: d.data().page ?? 0,
      content: d.data().content ?? '',
      selectedText: d.data().selectedText ?? '',
      createdAt: d.data().createdAt ?? new Date().toISOString(),
      updatedAt: d.data().updatedAt ?? new Date().toISOString(),
      tags: Array.isArray(d.data().tags) ? d.data().tags : [],
      color: d.data().color ?? 'amber',
    }));
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, notesPath);
    return [];
  }
}

/**
 * Saves a note to a book's subcollection
 */
export async function saveBookNote(
  bookId: string,
  note: BookNote
): Promise<void> {
  const notePath = `${BOOKS_COLLECTION}/${bookId}/notes/${note.id}`;
  try {
    const docRef = doc(db, BOOKS_COLLECTION, bookId, 'notes', note.id);
    const now = new Date().toISOString();
    await setDoc(docRef, {
      page: Number(note.page || 0),
      content: note.content || '',
      selectedText: note.selectedText || '',
      tags: Array.isArray(note.tags) ? note.tags : [],
      color: note.color || 'amber',
      createdAt: note.createdAt || now,
      updatedAt: now,
    }, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, notePath);
  }
}

/**
 * Deletes a note from a book's subcollection
 */
export async function deleteBookNote(bookId: string, noteId: string): Promise<void> {
  const notePath = `${BOOKS_COLLECTION}/${bookId}/notes/${noteId}`;
  try {
    const docRef = doc(db, BOOKS_COLLECTION, bookId, 'notes', noteId);
    await deleteDoc(docRef);
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, notePath);
  }
}

// ---------------- PROFILE SETTINGS ---------------- //

/**
 * Retrieves the user's personal profile settings
 */
export async function getProfileSettings(): Promise<ProfileSettings | null> {
  try {
    const docRef = doc(db, 'profile', 'settings');
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data() as ProfileSettings;
    }
    return null;
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, PROFILE_DOC);
    return null;
  }
}

/**
 * Saves personal profile settings
 */
export async function saveProfileSettings(profile: Partial<ProfileSettings>): Promise<void> {
  try {
    const docRef = doc(db, 'profile', 'settings');
    const now = new Date().toISOString();
    await setDoc(docRef, {
      ...profile,
      updatedAt: now,
    }, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, PROFILE_DOC);
  }
}
