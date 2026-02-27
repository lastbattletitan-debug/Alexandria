import { motion } from 'motion/react';
import { BookOpen, FileText, Trash2, Loader2, Plus } from 'lucide-react';
import { LibraryBook } from '../types';

interface BookCardProps {
  book: LibraryBook;
  onRead: (book: LibraryBook) => void;
  onViewNotes: (book: LibraryBook) => void;
  onDelete: (id: string) => void;
  zoom?: number;
}

export function BookCard({ book, onRead, onViewNotes, onDelete, zoom = 1 }: BookCardProps) {
  return (
    <motion.div
      whileHover={{ y: -8 }}
      className="bg-bg-card border border-white/5 rounded-[48px] p-6 flex flex-col items-center gap-4 group hover:border-white/20 transition-all aspect-[3/4] relative overflow-hidden"
    >
      {/* Image Container */}
      <div className="w-full flex-1 relative rounded-[32px] overflow-hidden bg-black/20">
          {book.thumbnail ? (
            <img 
              src={book.thumbnail} 
              alt={book.title} 
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <BookOpen size={48} className="text-text-muted opacity-20" />
            </div>
          )}
          
          {/* Hover Actions Overlay */}
          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3 z-10">
              <button 
                onClick={() => onRead(book)}
                className="p-3 bg-white text-black rounded-full hover:scale-110 transition-transform"
                title="Ler Livro"
              >
                <BookOpen size={20} />
              </button>
              <button 
                onClick={() => onViewNotes(book)}
                className="p-3 bg-blue-500 text-white rounded-full hover:scale-110 transition-transform"
                title="Ver Notas"
              >
                <FileText size={20} />
              </button>
              <button 
                onClick={() => onDelete(book.id)}
                className="p-3 bg-red-500 text-white rounded-full hover:scale-110 transition-transform"
                title="Excluir Livro"
              >
                <Trash2 size={20} />
              </button>
          </div>
      </div>

      {/* Info */}
      <div className="w-full text-center space-y-3 px-2 pb-2">
        <h3 
          className="font-bold text-text-primary line-clamp-1" 
          style={{ fontSize: `${14 * zoom}px` }}
          title={book.title}
        >
          {book.title}
        </h3>
        
        {/* Progress Bar */}
        <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div 
                className="h-full bg-text-primary rounded-full transition-all duration-500" 
                style={{ width: `${book.totalPages ? ((book.currentPage || 1) / book.totalPages) * 100 : 0}%` }}
            />
        </div>
        
        {/* Page Counter */}
        <p 
          className="font-bold text-text-muted"
          style={{ fontSize: `${10 * zoom}px` }}
        >
            {book.currentPage || 1} / {book.totalPages || '--'}
        </p>
      </div>
    </motion.div>
  );
}
