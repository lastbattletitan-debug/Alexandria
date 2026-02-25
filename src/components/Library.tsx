import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Upload, FileText, Trash2, BookOpen, Loader2 } from 'lucide-react';
import { useLibrary } from '../hooks/useLibrary';

export function Library() {
  const { books, addBook, removeBook, updateBookProgress } = useLibrary();
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      await processFiles(Array.from(files));
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    await processFiles(files);
  };

  const processFiles = async (files: File[]) => {
    setIsUploading(true);
    for (const file of files) {
      if (file.type === 'application/pdf') {
        // In a real app, we would read the file content here
        // For now, we'll just simulate the upload
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Simulating page count for now as we don't have a PDF parser
        const simulatedPageCount = Math.floor(Math.random() * 300) + 50; 
        
        addBook({
          title: file.name.replace('.pdf', ''),
          fileName: file.name,
          pageCount: simulatedPageCount,
          currentPage: 0,
          coverUrl: '', // Could generate a thumbnail here
        });
      }
    }
    setIsUploading(false);
  };

  return (
    <div className="flex-1 flex flex-col p-8 sm:p-12 overflow-y-auto">
      <header className="flex items-center justify-between gap-8 mb-12">
        <div>
          <h1 className="text-2xl font-bold text-text-primary mb-2">Sua Biblioteca</h1>
          <p className="text-text-muted">Gerencie seus livros e acompanhe seu progresso de leitura.</p>
        </div>
      </header>

      {/* Upload Area */}
      <div 
        className={`relative border-2 border-dashed rounded-[32px] p-12 flex flex-col items-center justify-center text-center transition-all cursor-pointer mb-12 ${
          isDragging 
            ? 'border-text-primary bg-border-subtle' 
            : 'border-border-strong hover:border-text-primary hover:bg-bg-card'
        }`}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileSelect} 
          accept="application/pdf" 
          multiple 
          className="hidden" 
        />
        
        {isUploading ? (
          <div className="flex flex-col items-center gap-4">
            <Loader2 size={48} className="text-text-primary animate-spin" />
            <p className="text-sm font-bold text-text-muted uppercase tracking-widest">Processando arquivos...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-border-subtle flex items-center justify-center mb-2">
              <Upload size={32} className="text-text-muted" />
            </div>
            <h3 className="text-lg font-bold text-text-primary">Arraste seus PDFs aqui</h3>
            <p className="text-sm text-text-muted max-w-sm">
              Ou clique para selecionar arquivos do seu computador.
            </p>
          </div>
        )}
      </div>

      {/* Books Grid */}
      {books.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-text-muted opacity-40">
          <BookOpen size={64} className="mb-4" />
          <p className="text-sm font-bold uppercase tracking-widest">Sua estante está vazia</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          <AnimatePresence>
            {books.map((book) => (
              <motion.div
                key={book.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="group bg-bg-card border border-border-subtle rounded-[24px] overflow-hidden hover:border-border-strong transition-all flex flex-col"
              >
                {/* Cover Area */}
                <div className="aspect-[3/4] bg-border-subtle relative flex items-center justify-center overflow-hidden group-hover:opacity-90 transition-opacity">
                  {book.coverUrl ? (
                    <img src={book.coverUrl} alt={book.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="flex flex-col items-center text-text-muted opacity-50">
                      <FileText size={48} strokeWidth={1} />
                      <span className="text-[10px] font-bold uppercase tracking-widest mt-2">PDF</span>
                    </div>
                  )}
                  
                  {/* Overlay Actions */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
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
                  <h3 className="font-bold text-text-primary line-clamp-2 mb-1" title={book.title}>
                    {book.title}
                  </h3>
                  <p className="text-xs text-text-muted mb-4">{book.pageCount} páginas</p>

                  <div className="mt-auto space-y-2">
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
                    
                    {/* Simple Progress Control for Demo */}
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
      )}
    </div>
  );
}
