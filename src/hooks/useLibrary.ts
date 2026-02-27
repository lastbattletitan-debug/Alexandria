import { useState, useEffect } from 'react';
import localforage from 'localforage';
import { LibraryBook } from '../types';

const STORAGE_KEY = 'ai-teachers-library';

export function useLibrary() {
  const [books, setBooks] = useState<LibraryBook[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const loadBooks = async () => {
      try {
        const stored = await localforage.getItem<LibraryBook[]>(STORAGE_KEY);
        if (stored) {
          // Regenerate URLs for stored blobs
          const booksWithUrls = stored.map(book => {
            if (book.file && book.file instanceof Blob) {
              return { ...book, url: URL.createObjectURL(book.file) };
            }
            return book;
          });
          setBooks(booksWithUrls);
        }
      } catch (e) {
        console.error('Failed to parse stored books', e);
      } finally {
        setIsLoaded(true);
      }
    };
    loadBooks();
  }, []);

  useEffect(() => {
    if (isLoaded) {
      const saveBooks = async () => {
        try {
          await localforage.setItem(STORAGE_KEY, books);
        } catch (e) {
          console.error('Failed to save books to localforage', e);
          alert('Aviso: Ocorreu um erro ao salvar os livros. O armazenamento do navegador pode estar cheio.');
        }
      };
      saveBooks();
    }
  }, [books, isLoaded]);

  const addBook = (book: Omit<LibraryBook, 'id' | 'addedAt'>) => {
    const newBook: LibraryBook = {
      ...book,
      id: crypto.randomUUID(),
      addedAt: new Date().toISOString(),
    };
    setBooks((prev) => [...prev, newBook]);
    return newBook;
  };

  const removeBook = (id: string) => {
    setBooks((prev) => prev.filter((b) => b.id !== id));
  };

  const addSnippet = (bookId: string, snippet: string) => {
    setBooks((prev) => prev.map(book => {
      if (book.id === bookId) {
        return {
          ...book,
          snippets: [...(book.snippets || []), snippet]
        };
      }
      return book;
    }));
  };

  const updateBookProgress = (bookId: string, currentPage: number, totalPages: number) => {
    setBooks((prev) => {
      const book = prev.find(b => b.id === bookId);
      if (book && book.currentPage === currentPage && book.totalPages === totalPages) {
        return prev;
      }
      return prev.map(b => {
        if (b.id === bookId) {
          return {
            ...b,
            currentPage,
            totalPages
          };
        }
        return b;
      });
    });
  };

  const updateBookCategory = (bookId: string, category: string) => {
    setBooks((prev) => prev.map(book => {
      if (book.id === bookId) {
        return {
          ...book,
          category
        };
      }
      return book;
    }));
  };

  return {
    books,
    addBook,
    removeBook,
    addSnippet,
    updateBookProgress,
    updateBookCategory,
  };
}
