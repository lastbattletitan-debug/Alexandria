import { motion } from 'motion/react';
import { BookOpen, FileText, Trash2, Loader2, Plus, Star } from 'lucide-react';
import { LibraryBook } from '../types';

interface BookCardProps {
  book: LibraryBook;
  onRead: (book: LibraryBook) => void;
  onViewNotes: (book: LibraryBook) => void;
  onDelete: (id: string) => void;
  viewMode?: 'grid' | 'list' | 'categories' | 'status';
  zoom?: number;
}

export function BookCard({ book, onRead, onViewNotes, onDelete, viewMode = 'grid', zoom = 1 }: BookCardProps) {
  const isList = viewMode === 'list';

  return (
    <motion.div
      whileHover={{ y: isList ? 0 : -8, x: isList ? 8 : 0 }}
      className={`bg-bg-card border border-white/5 rounded-[24px] lg:rounded-[32px] flex group hover:border-white/20 transition-all relative overflow-hidden ${
        isList ? 'flex-row h-24 lg:h-32 w-full items-center' : 'flex-col items-center aspect-[3/5]'
      }`}
      style={{ padding: isList ? `${12 * zoom}px ${16 * zoom}px` : `${16 * zoom}px` }}
    >
      {/* Image Container */}
      <div className={`${isList ? 'w-16 lg:w-20 h-20 lg:h-24' : 'w-full flex-1'} relative rounded-[16px] lg:rounded-[20px] overflow-hidden bg-black/20 flex-shrink-0`}>
          {book.thumbnail ? (
            <img 
              src={book.thumbnail} 
              alt={book.title} 
              className="w-full h-full object-cover grayscale brightness-[0.85] transition-all duration-700 group-hover:scale-110 group-hover:grayscale-0 group-hover:brightness-100"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <BookOpen size={isList ? 20 : 48} className="text-text-muted opacity-20" />
            </div>
          )}
          
          {/* Action Buttons - Top Right (Teacher Style) */}
          <div className={`absolute z-30 flex gap-1.5 lg:gap-2 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-all duration-300 ${
            isList ? 'right-2 lg:right-4 top-1/2 -translate-y-1/2 flex-row' : 'flex-col top-2 lg:top-4 right-2 lg:right-4 lg:translate-x-4 lg:group-hover:translate-x-0'
          }`}>
              <button 
                onClick={(e) => { e.stopPropagation(); onRead(book); }}
                className="p-2 lg:p-2.5 bg-text-primary text-bg-card backdrop-blur-xl rounded-lg lg:rounded-xl border border-border-strong transition-all hover:scale-110 shadow-xl"
                title="Ler Livro"
              >
                <BookOpen size={12} className="lg:w-3.5 lg:h-3.5" />
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); onViewNotes(book); }}
                className="p-2 lg:p-2.5 bg-bg-card/80 hover:bg-bg-card backdrop-blur-xl rounded-lg lg:rounded-xl text-text-primary border border-border-strong transition-all shadow-xl"
                title="Ver Notas"
              >
                <FileText size={12} className="lg:w-3.5 lg:h-3.5" />
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); onDelete(book.id); }}
                className="p-2 lg:p-2.5 bg-red-500/10 hover:bg-red-500/20 backdrop-blur-xl rounded-lg lg:rounded-xl text-red-500 border border-red-500/20 transition-all shadow-xl"
                title="Excluir Livro"
              >
                <Trash2 size={12} className="lg:w-3.5 lg:h-3.5" />
              </button>
          </div>
      </div>

      {/* Info */}
      <div className={`flex flex-col gap-1 lg:gap-2 ${isList ? 'flex-1 ml-4 lg:ml-6 text-left' : 'w-full flex-none text-center px-2 pb-2 mt-3 lg:mt-4'}`}>
        <div className={isList ? 'flex items-center justify-between' : ''}>
          <h3 
            className="font-bold text-text-primary line-clamp-1" 
            style={{ fontSize: `${(isList ? 14 : 14) * zoom}px` }}
            title={book.title}
          >
            {book.title}
          </h3>
          
          {isList && (
            <p 
              className="font-bold text-text-muted whitespace-nowrap ml-2 lg:ml-4"
              style={{ fontSize: `${(isList ? 8 : 10) * zoom}px` }}
            >
                {book.currentPage || 1} / {book.totalPages || '--'}
            </p>
          )}
        </div>

        <div className={`flex items-center gap-2 lg:gap-4 ${isList ? '' : 'flex-col'}`}>
          {/* Rating Stars */}
          {book.rating && book.rating > 0 ? (
            <div className="flex gap-0.5">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star 
                  key={star}
                  size={(isList ? 8 : 12) * zoom}
                  className={star <= (book.rating || 0) ? "fill-yellow-400 text-yellow-400" : "text-border-strong"}
                />
              ))}
            </div>
          ) : null}
          
          {/* Progress Bar */}
          <div className={`h-1 lg:h-1.5 bg-white/10 rounded-full overflow-hidden ${isList ? 'flex-1 max-w-[100px] lg:max-w-xs' : 'w-full mt-1 lg:mt-2'}`}>
              <div 
                  className="h-full bg-text-primary rounded-full transition-all duration-500" 
                  style={{ width: `${book.totalPages ? ((book.currentPage || 1) / book.totalPages) * 100 : 0}%` }}
              />
          </div>
        </div>
        
        {!isList && (
          <p 
            className="font-bold text-text-muted"
            style={{ fontSize: `${10 * zoom}px` }}
          >
              {book.currentPage || 1} / {book.totalPages || '--'}
          </p>
        )}
      </div>
    </motion.div>
  );
}
