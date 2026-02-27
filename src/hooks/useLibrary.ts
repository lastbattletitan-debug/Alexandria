import { useState, useEffect } from 'react';
import localforage from 'localforage';
import { LibraryBook } from '../types';

const STORAGE_KEY = 'ai-teachers-library';
const CATEGORIES_KEY = 'ai-teachers-categories';

export function useLibrary() {
  const [books, setBooks] = useState<LibraryBook[]>([]);
  const [globalCategories, setGlobalCategories] = useState<string[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        const storedBooks = await localforage.getItem<LibraryBook[]>(STORAGE_KEY);
        if (storedBooks) {
          // Regenerate URLs for stored blobs
          const booksWithUrls = storedBooks.map(book => {
            if (book.file && book.file instanceof Blob) {
              return { ...book, url: URL.createObjectURL(book.file) };
            }
            return book;
          });
          setBooks(booksWithUrls);
        }

        const storedCategories = await localforage.getItem<string[]>(CATEGORIES_KEY);
        if (storedCategories) {
          setGlobalCategories(storedCategories);
        }
      } catch (e) {
        console.error('Failed to parse stored data', e);
      } finally {
        setIsLoaded(true);
      }
    };
    loadData();
  }, []);

  useEffect(() => {
    if (isLoaded) {
      const saveData = async () => {
        try {
          await localforage.setItem(STORAGE_KEY, books);
          await localforage.setItem(CATEGORIES_KEY, globalCategories);
        } catch (e) {
          console.error('Failed to save data to localforage', e);
        }
      };
      saveData();
    }
  }, [books, globalCategories, isLoaded]);

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

  const updateBookStatus = (bookId: string, status: LibraryBook['status']) => {
    setBooks((prev) => prev.map(book => {
      if (book.id === bookId) {
        return { ...book, status };
      }
      return book;
    }));
  };

  const updateBookRating = (bookId: string, rating: number) => {
    setBooks((prev) => prev.map(book => {
      if (book.id === bookId) {
        return { ...book, rating };
      }
      return book;
    }));
  };

  const addBookCategory = (bookId: string, category: string) => {
    // Add to global if not exists
    if (!globalCategories.includes(category)) {
      setGlobalCategories(prev => [...prev, category]);
    }

    setBooks((prev) => prev.map(book => {
      if (book.id === bookId) {
        const categories = book.categories || [];
        if (!categories.includes(category)) {
          return { ...book, categories: [...categories, category] };
        }
      }
      return book;
    }));
  };

  const createGlobalCategory = (category: string) => {
    if (!globalCategories.includes(category)) {
      setGlobalCategories(prev => [...prev, category]);
    }
  };

  const removeBookCategory = (bookId: string, category: string) => {
    setBooks((prev) => prev.map(book => {
      if (book.id === bookId) {
        return { 
          ...book, 
          categories: (book.categories || []).filter(c => c !== category) 
        };
      }
      return book;
    }));
  };

  const updateSnippet = (bookId: string, index: number, newText: string) => {
    setBooks((prev) => prev.map(book => {
      if (book.id === bookId && book.snippets) {
        const newSnippets = [...book.snippets];
        newSnippets[index] = newText;
        return {
          ...book,
          snippets: newSnippets
        };
      }
      return book;
    }));
  };

  const deleteSnippet = (bookId: string, index: number) => {
    setBooks((prev) => prev.map(book => {
      if (book.id === bookId && book.snippets) {
        const newSnippets = book.snippets.filter((_, i) => i !== index);
        return {
          ...book,
          snippets: newSnippets
        };
      }
      return book;
    }));
  };

  const renameCategory = (oldName: string, newName: string) => {
    setGlobalCategories(prev => prev.map(c => c === oldName ? newName : c));
    setBooks((prev) => prev.map(book => {
      if (book.categories && book.categories.includes(oldName)) {
        return {
          ...book,
          categories: book.categories.map(c => c === oldName ? newName : c)
        };
      }
      return book;
    }));
  };

  const deleteCategory = (categoryName: string) => {
    setGlobalCategories(prev => prev.filter(c => c !== categoryName));
    setBooks((prev) => prev.map(book => {
      if (book.categories && book.categories.includes(categoryName)) {
        return {
          ...book,
          categories: book.categories.filter(c => c !== categoryName)
        };
      }
      return book;
    }));
  };

  const reorderBooks = (newBooks: LibraryBook[]) => {
    setBooks(newBooks);
  };

  return {
    books,
    globalCategories,
    addBook,
    removeBook,
    addSnippet,
    updateSnippet,
    deleteSnippet,
    updateBookProgress,
    updateBookStatus,
    updateBookRating,
    addBookCategory,
    removeBookCategory,
    createGlobalCategory,
    renameCategory,
    deleteCategory,
    reorderBooks,
  };
}
