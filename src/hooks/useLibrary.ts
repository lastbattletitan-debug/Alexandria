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
          setBooks(stored);
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

  return {
    books,
    addBook,
    removeBook,
  };
}
