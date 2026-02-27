import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { BookCard } from './BookCard';
import { LibraryBook } from '../types';

interface SortableBookCardProps {
  book: LibraryBook;
  onRead: (book: LibraryBook) => void;
  onViewNotes: (book: LibraryBook) => void;
  onDelete: (id: string) => void;
  viewMode: 'grid' | 'list' | 'categories' | 'status';
  zoom: number;
}

export function SortableBookCard({ book, onRead, onViewNotes, onDelete, viewMode, zoom }: SortableBookCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: book.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 'auto',
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <BookCard 
        book={book} 
        onRead={onRead} 
        onViewNotes={onViewNotes} 
        onDelete={onDelete} 
        viewMode={viewMode}
        zoom={zoom}
      />
    </div>
  );
}
