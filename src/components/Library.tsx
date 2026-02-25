import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Upload, FileText, Trash2, BookOpen, Loader2, Plus, ExternalLink, X } from 'lucide-react';
import { useLibrary } from '../hooks/useLibrary';
import { LibraryBook } from '../types';
import { generatePdfThumbnail } from '../utils/pdfUtils';

interface LibraryProps {
  zoomLevel?: number;
}

export function Library({ zoomLevel = 1 }: LibraryProps) {
  const { books, addBook, removeBook, updateBookProgress } = useLibrary();
  const [isUploading, setIsUploading] = useState(false);
  const [readingBook, setReadingBook] = useState<LibraryBook | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      await processFiles(Array.from(files));
    }
  };

  const processFiles = async (files: File[]) => {
    setIsUploading(true);
    for (const file of files) {
      if (file.type === 'application/pdf') {
        try {
          // Generate thumbnail
          const thumbnail = await generatePdfThumbnail(file);
          
          const reader = new FileReader();
          reader.onload = async (event) => {
            const base64 = event.target?.result as string;
            // Simulating page count for now as we don't have a PDF parser
            const simulatedPageCount = Math.floor(Math.random() * 300) + 50; 
            
            addBook({
              title: file.name.replace('.pdf', ''),
              fileName: file.name,
              pageCount: simulatedPageCount,
              currentPage: 0,
              fileData: base64,
              coverUrl: thumbnail, // Use generated thumbnail
            });
          };
          reader.readAsDataURL(file);
        } catch (error) {
          console.error('Error processing PDF:', error);
        }
      }
    }
    setIsUploading(false);
  };

  const openBook = (book: LibraryBook) => {
    if (!book.fileData) return;
    setReadingBook(book);
  };

  const closeBook = () => {
    setReadingBook(null);
  };

  // Generate a consistent color based on the string
  const stringToColor = (str: string) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const c = (hash & 0x00FFFFFF).toString(16).toUpperCase();
    return '#' + '00000'.substring(0, 6 - c.length) + c;
  };

  return (
    <div className="flex-1 flex flex-col p-8 sm:p-12 overflow-y-auto relative">
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileSelect} 
        accept="application/pdf" 
        multiple 
        className="hidden" 
      />

      <div 
        className="grid gap-6"
        style={{ 
          gridTemplateColumns: `repeat(auto-fill, minmax(${280 * zoomLevel}px, 1fr))` 
        }}
      >
        {/* Upload Card - Always First */}
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="group relative rounded-[32px] border border-dashed border-border-strong bg-bg-card aspect-[3/4] flex flex-col items-center justify-center gap-4 hover:bg-border-strong transition-all active:scale-[0.98]"
        >
          {isUploading ? (
            <Loader2 size={32} className="text-text-primary animate-spin" />
          ) : (
            <>
              <div className="w-12 h-12 rounded-full bg-border-subtle flex items-center justify-center group-hover:bg-border-strong transition-colors">
                <Plus size={24} className="text-text-muted group-hover:text-text-primary transition-colors" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-text-muted group-hover:text-text-primary transition-colors">
                Novo Livro
              </span>
            </>
          )}
        </button>

        <AnimatePresence>
          {books.map((book) => (
            <motion.div
              key={book.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              onClick={() => openBook(book)}
              className="group bg-bg-card border border-border-subtle rounded-[24px] overflow-hidden hover:border-border-strong transition-all flex flex-col cursor-pointer"
            >
              {/* Cover Area */}
              <div className="aspect-[3/4] bg-border-subtle relative flex items-center justify-center overflow-hidden group-hover:opacity-90 transition-opacity">
                {book.coverUrl ? (
                  <img src={book.coverUrl} alt={book.title} className="w-full h-full object-cover" />
                ) : (
                  <div 
                    className="w-full h-full flex flex-col items-center justify-center p-6 text-center"
                    style={{ 
                      background: `linear-gradient(135deg, ${stringToColor(book.title)}20 0%, ${stringToColor(book.title)}40 100%)` 
                    }}
                  >
                    <BookOpen size={48} className="mb-4 opacity-50" style={{ color: stringToColor(book.title) }} />
                    <h3 
                      className="font-serif text-lg font-bold leading-tight line-clamp-3"
                      style={{ color: stringToColor(book.title) }}
                    >
                      {book.title}
                    </h3>
                  </div>
                )}
                
                {/* Overlay Actions */}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                  <button 
                    onClick={(e) => { e.stopPropagation(); openBook(book); }}
                    className="p-3 bg-text-primary text-bg-main rounded-xl hover:scale-110 transition-all"
                    title="Ler livro"
                  >
                    <BookOpen size={20} />
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); removeBook(book.id); }}
                    className="p-3 bg-red-500/20 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all"
                    title="Remover livro"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
              </div>

              {/* Info Area */}
              <div className="p-6 flex-1 flex flex-col">
                <h3 className="font-bold text-text-primary line-clamp-1 mb-1" title={book.title}>
                  {book.title}
                </h3>
                <p className="text-xs text-text-muted mb-4">{book.pageCount} páginas</p>

                <div className="mt-auto space-y-2" onClick={(e) => e.stopPropagation()}>
                  <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-text-muted">
                    <span>Progresso</span>
                    <span>{Math.round((book.currentPage / book.pageCount) * 100)}%</span>
                  </div>
                  <div className="h-1.5 bg-border-subtle rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-text-primary rounded-full transition-all duration-500"
                      style={{ width: `${(book.currentPage / book.pageCount) * 100}%` }}
                    />
                  </div>
                  
                  <input 
                    type="range" 
                    min="0" 
                    max={book.pageCount} 
                    value={book.currentPage}
                    onChange={(e) => updateBookProgress(book.id, parseInt(e.target.value))}
                    className="w-full h-1 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer absolute bottom-0 left-0"
                  />
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* PDF Reader Modal */}
      <AnimatePresence>
        {readingBook && readingBook.fileData && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-bg-main flex flex-col"
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-border-subtle bg-bg-sidebar">
              <h2 className="text-lg font-bold text-text-primary truncate max-w-2xl">
                {readingBook.title}
              </h2>
              <button
                onClick={closeBook}
                className="p-2 hover:bg-border-subtle rounded-full transition-colors"
              >
                <X size={24} className="text-text-muted hover:text-text-primary" />
              </button>
            </div>
            <div className="flex-1 bg-gray-900 relative">
              <iframe
                src={readingBook.fileData}
                className="w-full h-full border-0"
                title={readingBook.title}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
