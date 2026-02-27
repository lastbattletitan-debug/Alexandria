import { motion } from 'motion/react';
import { BookOpen, FileText, Trash2, Loader2, Plus, Star } from 'lucide-react';
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
      className="bg-bg-card border border-white/5 rounded-[32px] flex flex-col items-center group hover:border-white/20 transition-all aspect-[3/5] relative overflow-hidden"
      style={{ padding: `${16 * zoom}px` }}
    >
      {/* Image Container */}
      <div className="w-full flex-1 relative rounded-[24px] overflow-hidden bg-black/20">
          {book.thumbnail ? (
            <img 
              src={book.thumbnail} 
              alt={book.title} 
              className="w-full h-full object-cover grayscale brightness-[0.85] transition-all duration-700 group-hover:scale-110 group-hover:grayscale-0 group-hover:brightness-100"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <BookOpen size={48} className="text-text-muted opacity-20" />
            </div>
          )}
          
          {/* Action Buttons - Top Right (Teacher Style) */}
          <div className="absolute z-30 flex flex-col gap-2 top-4 right-4 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-4 group-hover:translate-x-0">
              <button 
                onClick={(e) => { e.stopPropagation(); onRead(book); }}
                className="p-3 bg-text-primary text-bg-card backdrop-blur-xl rounded-2xl border border-border-strong transition-all hover:scale-110 shadow-xl"
                title="Ler Livro"
              >
                <BookOpen size={16} />
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); onViewNotes(book); }}
                className="p-3 bg-bg-card/80 hover:bg-bg-card backdrop-blur-xl rounded-2xl text-text-primary border border-border-strong transition-all shadow-xl"
                title="Ver Notas"
              >
                <FileText size={16} />
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); onDelete(book.id); }}
                className="p-3 bg-red-500/10 hover:bg-red-500/20 backdrop-blur-xl rounded-2xl text-red-500 border border-red-500/20 transition-all shadow-xl"
                title="Excluir Livro"
              >
                <Trash2 size={16} />
              </button>
          </div>
      </div>

      {/* Info */}
      <div className="w-full flex-none text-center space-y-2 px-2 pb-2 mt-4">
        <h3 
          className="font-bold text-text-primary line-clamp-1" 
          style={{ fontSize: `${14 * zoom}px` }}
          title={book.title}
        >
          {book.title}
        </h3>

        {/* Rating Stars */}
        {book.rating && book.rating > 0 ? (
          <div className="flex justify-center gap-0.5">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star 
                key={star}
                size={12 * zoom}
                className={star <= (book.rating || 0) ? "fill-yellow-400 text-yellow-400" : "text-border-strong"}
              />
            ))}
          </div>
        ) : null}
        
        {/* Progress Bar */}
        <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden mt-2">
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
