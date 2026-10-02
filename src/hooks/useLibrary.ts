import { useState, useEffect, useRef, useCallback } from 'react';
import localforage from 'localforage';
import { LibraryBook, BookNote, BookStatus } from '../types';
import {
  getBooksFromFirestore,
  saveBookToFirestore,
  updateBookPartial,
  deleteBookFromFirestore,
  updateBooksOrderInFirestore,
  getBookNotes,
  saveBookNote,
  deleteBookNote,
} from '../services/firestoreService';
import {
  uploadBookContent,
  uploadBookImage,
  getStorageUrl,
  deleteStoragePath,
} from '../services/storageService';
import { runFirebaseMigration } from '../services/migrationService';

const CATEGORIES_KEY = 'alexandria-categories-v2';
const CACHE_BOOKS_KEY = 'alexandria-books-cache-v2';

export function useLibrary() {
  const [books, setBooks] = useState<LibraryBook[]>([]);
  const [globalCategories, setGlobalCategories] = useState<string[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // Debounce maps for progress writes to Firestore
  const progressDebounceMap = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Load from Firebase on mount
  useEffect(() => {
    let isCancelled = false;

    async function initialize() {
      setIsSyncing(true);
      try {
        // 1. Fast local cache load for instant UI
        const cachedBooks = await localforage.getItem<LibraryBook[]>(CACHE_BOOKS_KEY);
        const cachedCategories = await localforage.getItem<string[]>(CATEGORIES_KEY);
        
        if (!isCancelled && cachedBooks && cachedBooks.length > 0) {
          setBooks(cachedBooks);
        }
        if (!isCancelled && cachedCategories) {
          setGlobalCategories(cachedCategories);
        }

        // 2. Run background migration if first time
        await runFirebaseMigration();

        // 3. Fetch canonical source of truth from Cloud Firestore
        const remoteBooks = await getBooksFromFirestore();

        // Resolve cover and content URLs asynchronously
        const hydratedBooks = await Promise.all(
          remoteBooks.map(async (book) => {
            let resolvedUrl = book.url || '';
            let resolvedCover = book.thumbnail || '';

            if (book.contentPath) {
              resolvedUrl = await getStorageUrl(book.contentPath);
            }
            if (book.coverPath) {
              resolvedCover = await getStorageUrl(book.coverPath);
            }

            return {
              ...book,
              url: resolvedUrl,
              thumbnail: resolvedCover || resolvedUrl,
            };
          })
        );

        if (!isCancelled) {
          setBooks(hydratedBooks);
          await localforage.setItem(CACHE_BOOKS_KEY, hydratedBooks);
        }
      } catch (err) {
        console.error('Failed to load books from Firebase Firestore:', err);
      } finally {
        if (!isCancelled) {
          setIsLoaded(true);
          setIsSyncing(false);
        }
      }
    }

    initialize();

    return () => {
      isCancelled = true;
      progressDebounceMap.current.forEach(timer => clearTimeout(timer));
    };
  }, []);

  // Sync books to local cache whenever books state changes
  useEffect(() => {
    if (isLoaded && books.length > 0) {
      localforage.setItem(CACHE_BOOKS_KEY, books).catch(() => {});
    }
  }, [books, isLoaded]);

  // Sync categories
  useEffect(() => {
    if (isLoaded) {
      localforage.setItem(CATEGORIES_KEY, globalCategories).catch(() => {});
    }
  }, [globalCategories, isLoaded]);

  /**
   * Adds a book with file upload to Firebase Cloud Storage and record to Cloud Firestore
   */
  const addBook = async (
    bookData: {
      title: string;
      author: string;
      file?: Blob | File;
      thumbnail?: string;
      categories?: string[];
      status?: BookStatus;
      rating?: number;
      totalPages?: number;
      format?: 'md' | 'pdf' | 'epub' | 'txt' | 'other';
    }
  ) => {
    const bookId = crypto.randomUUID();
    const now = new Date().toISOString();
    let contentPath = '';
    let coverPath = '';
    let resolvedUrl = '';
    let resolvedCover = bookData.thumbnail || '';

    // Process content file if provided
    let textContent = '';
    if (bookData.file) {
      try {
        const ext = bookData.format || (bookData.title.endsWith('.md') ? 'md' : 'pdf');
        const uploadRes = await uploadBookContent(bookId, bookData.file, ext);
        contentPath = uploadRes.storagePath;
        resolvedUrl = uploadRes.downloadUrl;
        textContent = uploadRes.textContent || '';
      } catch (err) {
        console.error('Failed to process book file:', err);
      }
    }

    // Process thumbnail cover if provided
    if (bookData.thumbnail && bookData.thumbnail.startsWith('data:image')) {
      try {
        coverPath = bookData.thumbnail;
        resolvedCover = bookData.thumbnail;
      } catch (err) {
        console.error('Failed to process book cover:', err);
      }
    } else if (bookData.thumbnail) {
      coverPath = bookData.thumbnail;
      resolvedCover = bookData.thumbnail;
    } else {
      coverPath = '/covers/alexandria-codex.svg';
      resolvedCover = '/covers/alexandria-codex.svg';
    }

    const newBook: LibraryBook = {
      id: bookId,
      title: bookData.title,
      author: bookData.author || 'Desconhecido',
      coverPath,
      contentPath,
      content: textContent,
      status: bookData.status || 'unread',
      currentPage: 0,
      totalPages: bookData.totalPages || 1,
      progress: 0,
      readingOrder: books.length,
      favorite: false,
      createdAt: now,
      updatedAt: now,
      lastOpenedAt: now,
      startedAt: bookData.status === 'reading' ? now : null,
      finishedAt: bookData.status === 'finished' ? now : null,
      currentScrollPosition: 0,
      lastOpenedChapter: '',
      readingTime: 0,
      format: bookData.format || (bookData.title.endsWith('.md') ? 'md' : 'pdf'),
      categories: bookData.categories || [],
      rating: bookData.rating || 0,
      url: resolvedUrl || (bookData.file ? URL.createObjectURL(bookData.file) : ''),
      thumbnail: resolvedCover,
      file: bookData.file,
    };

    // Optimistic UI update
    setBooks((prev) => [...prev, newBook]);

    // Save to Firestore
    try {
      await saveBookToFirestore(newBook, textContent);
    } catch (err) {
      console.error('Failed to save book to Firestore:', err);
    }

    return newBook;
  };

  /**
   * Removes a book from Firestore, Storage, and local state
   */
  const removeBook = async (id: string) => {
    const bookToRemove = books.find(b => b.id === id);
    setBooks((prev) => prev.filter((b) => b.id !== id));

    try {
      await deleteBookFromFirestore(id);
      if (bookToRemove?.contentPath) {
        await deleteStoragePath(bookToRemove.contentPath);
      }
      if (bookToRemove?.coverPath) {
        await deleteStoragePath(bookToRemove.coverPath);
      }
    } catch (err) {
      console.error('Failed to delete book from Firebase:', err);
    }
  };

  /**
   * Updates reading progress with debounced Firestore writes
   */
  const updateBookProgress = useCallback((
    bookId: string,
    currentPage: number,
    totalPages: number,
    extra?: { scrollPosition?: number; chapter?: string }
  ) => {
    const safeTotal = Math.max(1, totalPages || 1);
    const safeCurrent = Math.max(0, currentPage || 0);
    const progress = Math.min(1.0, Math.max(0.0, safeCurrent / safeTotal));
    const now = new Date().toISOString();

    // 1. Immediate optimistic UI update
    setBooks((prev) => {
      return prev.map((b) => {
        if (b.id === bookId) {
          const isFinished = progress >= 0.99 || safeCurrent >= safeTotal - 1;
          const status = isFinished ? 'finished' : (b.status === 'unread' ? 'reading' : b.status);

          return {
            ...b,
            currentPage: safeCurrent,
            totalPages: safeTotal,
            progress,
            status,
            lastOpenedAt: now,
            currentScrollPosition: extra?.scrollPosition ?? b.currentScrollPosition,
            lastOpenedChapter: extra?.chapter ?? b.lastOpenedChapter,
            finishedAt: isFinished ? (b.finishedAt || now) : (status !== 'finished' ? null : b.finishedAt),
            startedAt: b.startedAt || now,
          };
        }
        return b;
      });
    });

    // 2. Debounced persistent Firestore update (500ms)
    const existingTimer = progressDebounceMap.current.get(bookId);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    const timer = setTimeout(async () => {
      try {
        const isFinished = progress >= 0.99 || safeCurrent >= safeTotal - 1;
        await updateBookPartial(bookId, {
          currentPage: safeCurrent,
          totalPages: safeTotal,
          progress,
          lastOpenedAt: now,
          currentScrollPosition: extra?.scrollPosition || 0,
          lastOpenedChapter: extra?.chapter || '',
          ...(isFinished ? { status: 'finished', finishedAt: now } : {}),
        });
      } catch (err) {
        console.error('Failed to update book progress in Firestore:', err);
      } finally {
        progressDebounceMap.current.delete(bookId);
      }
    }, 500);

    progressDebounceMap.current.set(bookId, timer);
  }, []);

  /**
   * Updates book status (unread, reading, paused, finished)
   */
  const updateBookStatus = async (bookId: string, status: BookStatus) => {
    const now = new Date().toISOString();
    
    setBooks((prev) => prev.map(book => {
      if (book.id === bookId) {
        return {
          ...book,
          status,
          updatedAt: now,
          startedAt: status === 'reading' && !book.startedAt ? now : book.startedAt,
          finishedAt: status === 'finished' ? now : null,
        };
      }
      return book;
    }));

    try {
      await updateBookPartial(bookId, {
        status,
        updatedAt: now,
        ...(status === 'finished' ? { finishedAt: now } : {}),
      });
    } catch (err) {
      console.error('Failed to update book status in Firestore:', err);
    }
  };

  /**
   * Updates book rating
   */
  const updateBookRating = async (bookId: string, rating: number) => {
    setBooks((prev) => prev.map(book => {
      if (book.id === bookId) {
        return { ...book, rating };
      }
      return book;
    }));

    try {
      await updateBookPartial(bookId, { rating });
    } catch (err) {
      console.error('Failed to update book rating in Firestore:', err);
    }
  };

  /**
   * Toggles book favorite state
   */
  const toggleFavorite = async (bookId: string) => {
    let nextFav = false;
    setBooks((prev) => prev.map(book => {
      if (book.id === bookId) {
        nextFav = !book.favorite;
        return { ...book, favorite: nextFav };
      }
      return book;
    }));

    try {
      await updateBookPartial(bookId, { favorite: nextFav });
    } catch (err) {
      console.error('Failed to toggle favorite in Firestore:', err);
    }
  };

  /**
   * Reorders books with batch write to Firestore
   */
  const reorderBooks = async (newBooks: LibraryBook[]) => {
    const ordered = newBooks.map((b, i) => ({ ...b, readingOrder: i }));
    setBooks(ordered);

    try {
      await updateBooksOrderInFirestore(ordered.map(b => b.id));
    } catch (err) {
      console.error('Failed to reorder books in Firestore:', err);
    }
  };

  // ---------------- CATEGORY HELPERS ---------------- //
  const addBookCategory = async (bookId: string, category: string) => {
    if (!globalCategories.includes(category)) {
      setGlobalCategories(prev => [...prev, category]);
    }

    let updatedCategories: string[] = [];
    setBooks((prev) => prev.map(book => {
      if (book.id === bookId) {
        const categories = book.categories || [];
        if (!categories.includes(category)) {
          updatedCategories = [...categories, category];
          return { ...book, categories: updatedCategories };
        }
      }
      return book;
    }));

    if (updatedCategories.length > 0) {
      try {
        await updateBookPartial(bookId, { categories: updatedCategories });
      } catch (e) {
        console.error(e);
      }
    }
  };

  const removeBookCategory = async (bookId: string, category: string) => {
    let updatedCategories: string[] = [];
    setBooks((prev) => prev.map(book => {
      if (book.id === bookId) {
        updatedCategories = (book.categories || []).filter(c => c !== category);
        return { ...book, categories: updatedCategories };
      }
      return book;
    }));

    try {
      await updateBookPartial(bookId, { categories: updatedCategories });
    } catch (e) {
      console.error(e);
    }
  };

  const createGlobalCategory = (category: string) => {
    if (!globalCategories.includes(category)) {
      setGlobalCategories(prev => [...prev, category]);
    }
  };

  const renameCategory = (oldName: string, newName: string) => {
    setGlobalCategories(prev => prev.map(c => c === oldName ? newName : c));
    setBooks((prev) => prev.map(book => {
      if (book.categories && book.categories.includes(oldName)) {
        const cats = book.categories.map(c => c === oldName ? newName : c);
        updateBookPartial(book.id, { categories: cats }).catch(() => {});
        return { ...book, categories: cats };
      }
      return book;
    }));
  };

  const deleteCategory = (categoryName: string) => {
    setGlobalCategories(prev => prev.filter(c => c !== categoryName));
    setBooks((prev) => prev.map(book => {
      if (book.categories && book.categories.includes(categoryName)) {
        const cats = book.categories.filter(c => c !== categoryName);
        updateBookPartial(book.id, { categories: cats }).catch(() => {});
        return { ...book, categories: cats };
      }
      return book;
    }));
  };

  // ---------------- NOTES SUBCOLLECTION ---------------- //
  const loadNotesForBook = async (bookId: string): Promise<BookNote[]> => {
    try {
      const notes = await getBookNotes(bookId);
      setBooks(prev => prev.map(b => b.id === bookId ? { ...b, notes } : b));
      return notes;
    } catch (e) {
      console.error('Failed to load notes:', e);
      return [];
    }
  };

  const addNote = async (bookId: string, noteData: Omit<BookNote, 'id' | 'bookId' | 'createdAt' | 'updatedAt'>) => {
    const noteId = crypto.randomUUID();
    const now = new Date().toISOString();
    const newNote: BookNote = {
      id: noteId,
      bookId,
      page: noteData.page,
      content: noteData.content,
      selectedText: noteData.selectedText || '',
      tags: noteData.tags || [],
      color: noteData.color || 'amber',
      createdAt: now,
      updatedAt: now,
    };

    setBooks(prev => prev.map(b => {
      if (b.id === bookId) {
        return { ...b, notes: [...(b.notes || []), newNote] };
      }
      return b;
    }));

    try {
      await saveBookNote(bookId, newNote);
    } catch (err) {
      console.error('Failed to save note to Firestore:', err);
    }
    return newNote;
  };

  const editNote = async (bookId: string, noteId: string, content: string, color?: string) => {
    const now = new Date().toISOString();
    setBooks(prev => prev.map(b => {
      if (b.id === bookId && b.notes) {
        return {
          ...b,
          notes: b.notes.map(n => n.id === noteId ? { ...n, content, color: color || n.color, updatedAt: now } : n)
        };
      }
      return b;
    }));

    const book = books.find(b => b.id === bookId);
    const existingNote = book?.notes?.find(n => n.id === noteId);
    if (existingNote) {
      try {
        await saveBookNote(bookId, {
          ...existingNote,
          content,
          color: color || existingNote.color,
          updatedAt: now,
        });
      } catch (err) {
        console.error('Failed to update note in Firestore:', err);
      }
    }
  };

  const removeNote = async (bookId: string, noteId: string) => {
    setBooks(prev => prev.map(b => {
      if (b.id === bookId && b.notes) {
        return {
          ...b,
          notes: b.notes.filter(n => n.id !== noteId)
        };
      }
      return b;
    }));

    try {
      await deleteBookNote(bookId, noteId);
    } catch (err) {
      console.error('Failed to delete note from Firestore:', err);
    }
  };

  // Snippets compatibility mapping
  const addSnippet = async (bookId: string, snippet: string) => {
    const book = books.find(b => b.id === bookId);
    await addNote(bookId, {
      page: book?.currentPage || 0,
      content: snippet,
      tags: [],
    });
  };

  const updateSnippet = (bookId: string, index: number, newText: string) => {
    const book = books.find(b => b.id === bookId);
    if (book?.notes && book.notes[index]) {
      editNote(bookId, book.notes[index].id, newText);
    }
  };

  const deleteSnippet = (bookId: string, index: number) => {
    const book = books.find(b => b.id === bookId);
    if (book?.notes && book.notes[index]) {
      removeNote(bookId, book.notes[index].id);
    }
  };

  return {
    books,
    globalCategories,
    isLoaded,
    isSyncing,
    addBook,
    removeBook,
    updateBookProgress,
    updateBookStatus,
    updateBookRating,
    toggleFavorite,
    reorderBooks,
    addBookCategory,
    removeBookCategory,
    createGlobalCategory,
    renameCategory,
    deleteCategory,
    loadNotesForBook,
    addNote,
    editNote,
    removeNote,
    addSnippet,
    updateSnippet,
    deleteSnippet,
  };
}
