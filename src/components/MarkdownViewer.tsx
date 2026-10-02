import { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { 
  ChevronLeft, 
  ChevronRight, 
  BookOpen, 
  StickyNote, 
  Maximize2, 
  Minimize2, 
  Type, 
  ZoomIn, 
  ZoomOut, 
  Plus, 
  Trash2, 
  Tag, 
  X,
  Sparkles,
  Bookmark
} from 'lucide-react';
import { LibraryBook, BookNote } from '../types';
import { downloadStorageText } from '../services/storageService';
import { loadBookFullContent } from '../services/firestoreService';

interface MarkdownViewerProps {
  book: LibraryBook;
  onClose: () => void;
  onProgressUpdate: (currentPage: number, totalPages: number, extra?: { scrollPosition?: number; chapter?: string }) => void;
  notes?: BookNote[];
  onAddNote?: (note: { page: number; content: string; selectedText?: string; tags: string[]; color?: string }) => Promise<any>;
  onDeleteNote?: (noteId: string) => Promise<any>;
  onUpdateStatus?: (status: LibraryBook['status']) => void;
}

export function MarkdownViewer({
  book,
  onClose,
  onProgressUpdate,
  notes = [],
  onAddNote,
  onDeleteNote,
  onUpdateStatus,
}: MarkdownViewerProps) {
  const [content, setContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pagination by chapters or chunks
  const [pages, setPages] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState<number>(book.currentPage || 0);
  const [fontSize, setFontSize] = useState<number>(18);
  const [theme, setTheme] = useState<'dark' | 'vintage' | 'night'>('vintage');
  const [showNotesDrawer, setShowNotesDrawer] = useState(false);
  const [newNoteText, setNewNoteText] = useState('');
  const [selectedText, setSelectedText] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const contentAreaRef = useRef<HTMLDivElement>(null);

  // Load markdown text
  useEffect(() => {
    let isCancelled = false;

    async function loadMarkdown() {
      setIsLoading(true);
      setError(null);
      try {
        let text = await loadBookFullContent(book);
        if (!text && book.contentPath) {
          text = await downloadStorageText(book.contentPath);
        } else if (!text && book.url) {
          const res = await fetch(book.url);
          text = await res.text();
        } else if (!text && book.file) {
          text = await book.file.text();
        }

        if (!isCancelled) {
          if (!text) {
            text = '# ' + book.title + '\n\n*Nenhum conteúdo disponível.*';
          }
          setContent(text);

          // Split into chapters by heading `# ` or `## ` or paragraphs of ~2500 chars
          const chapters = splitMarkdownIntoPages(text);
          setPages(chapters);
          
          const initialPage = Math.min(Math.max(0, book.currentPage || 0), Math.max(0, chapters.length - 1));
          setCurrentPage(initialPage);
        }
      } catch (err: any) {
        if (!isCancelled) {
          console.error('Error loading Markdown book:', err);
          setError(err.message || 'Erro ao carregar conteúdo Markdown');
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    }

    loadMarkdown();
    return () => {
      isCancelled = true;
    };
  }, [book.id, book.content, book.contentPath, book.url, book.file, book.title]);

  // Update progress callback
  useEffect(() => {
    if (pages.length > 0) {
      onProgressUpdate(currentPage, pages.length, {
        scrollPosition: contentAreaRef.current?.scrollTop || 0,
      });
    }
  }, [currentPage, pages.length, onProgressUpdate]);

  // Text selection handler
  const handleMouseUp = () => {
    const sel = window.getSelection()?.toString().trim();
    if (sel && sel.length > 2) {
      setSelectedText(sel);
    }
  };

  const handleNextPage = () => {
    if (currentPage < pages.length - 1) {
      const next = currentPage + 1;
      setCurrentPage(next);
      contentAreaRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 0) {
      const prev = currentPage - 1;
      setCurrentPage(prev);
      contentAreaRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleCreateNote = async () => {
    if (!newNoteText.trim() || !onAddNote) return;
    await onAddNote({
      page: currentPage,
      content: newNoteText.trim(),
      selectedText: selectedText || undefined,
      tags: [],
      color: 'amber',
    });
    setNewNoteText('');
    setSelectedText('');
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen?.().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const currentNotes = notes.filter((n) => n.page === currentPage);

  return (
    <div 
      ref={containerRef}
      className={`fixed inset-0 z-50 flex flex-col select-text ${
        theme === 'night' 
          ? 'bg-[#08090C] text-slate-200' 
          : theme === 'vintage' 
          ? 'bg-[#121110] text-[#E8E2D5]' 
          : 'bg-[#18181B] text-zinc-100'
      }`}
    >
      {/* Top Navigation Bar */}
      <div className="h-14 border-b border-white/10 px-4 flex items-center justify-between backdrop-blur-md bg-black/40 z-20">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/10 text-white/70 hover:text-white transition-colors"
            title="Fechar leitor"
          >
            <ChevronLeft size={20} />
          </button>
          <div className="flex flex-col">
            <span className="font-semibold text-sm line-clamp-1 max-w-xs md:max-w-md">
              {book.title}
            </span>
            <span className="text-xs text-white/50">{book.author}</span>
          </div>
        </div>

        {/* Reader Controls */}
        <div className="flex items-center gap-2">
          {/* Theme selector */}
          <div className="flex items-center bg-white/5 p-1 rounded-lg border border-white/10">
            <button
              onClick={() => setTheme('vintage')}
              className={`px-2 py-1 rounded text-xs transition-colors ${theme === 'vintage' ? 'bg-amber-700/50 text-amber-200 font-semibold' : 'text-white/50 hover:text-white'}`}
            >
              Papiro
            </button>
            <button
              onClick={() => setTheme('night')}
              className={`px-2 py-1 rounded text-xs transition-colors ${theme === 'night' ? 'bg-indigo-900/60 text-indigo-200 font-semibold' : 'text-white/50 hover:text-white'}`}
            >
              Noite
            </button>
            <button
              onClick={() => setTheme('dark')}
              className={`px-2 py-1 rounded text-xs transition-colors ${theme === 'dark' ? 'bg-zinc-700/60 text-white font-semibold' : 'text-white/50 hover:text-white'}`}
            >
              Clean
            </button>
          </div>

          {/* Font sizing */}
          <div className="flex items-center gap-1 bg-white/5 p-1 rounded-lg border border-white/10">
            <button
              onClick={() => setFontSize(s => Math.max(14, s - 2))}
              className="p-1 text-white/60 hover:text-white"
              title="Diminuir texto"
            >
              <ZoomOut size={15} />
            </button>
            <span className="text-xs font-mono px-1">{fontSize}</span>
            <button
              onClick={() => setFontSize(s => Math.min(28, s + 2))}
              className="p-1 text-white/60 hover:text-white"
              title="Aumentar texto"
            >
              <ZoomIn size={15} />
            </button>
          </div>

          {/* Notes button */}
          <button
            onClick={() => setShowNotesDrawer(!showNotesDrawer)}
            className={`p-2 rounded-lg border transition-colors relative ${showNotesDrawer ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' : 'bg-white/5 border-white/10 text-white/70 hover:text-white'}`}
            title="Notas e Destaques"
          >
            <StickyNote size={18} />
            {notes.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-amber-500 text-black font-bold text-[10px] w-4 h-4 rounded-full flex items-center justify-center">
                {notes.length}
              </span>
            )}
          </button>

          {/* Fullscreen */}
          <button
            onClick={toggleFullscreen}
            className="p-2 rounded-lg bg-white/5 border border-white/10 text-white/70 hover:text-white transition-colors"
            title="Tela cheia"
          >
            {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex relative overflow-hidden">
        {/* Page Reader Container */}
        <div 
          ref={contentAreaRef}
          onMouseUp={handleMouseUp}
          className="flex-1 overflow-y-auto px-4 py-8 md:px-12 lg:px-24 flex justify-center"
        >
          {isLoading ? (
            <div className="flex flex-col items-center justify-center gap-4 my-auto">
              <div className="w-10 h-10 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
              <span className="text-sm text-white/60">Carregando livro Markdown...</span>
            </div>
          ) : error ? (
            <div className="my-auto p-6 rounded-2xl bg-red-950/40 border border-red-800 text-red-300 max-w-md text-center">
              <p className="font-semibold text-base mb-2">Não foi possível carregar o livro</p>
              <p className="text-xs opacity-80">{error}</p>
            </div>
          ) : (
            <div 
              className={`w-full max-w-3xl leading-relaxed transition-all duration-200 prose prose-invert max-w-none ${
                theme === 'vintage' ? 'prose-headings:text-amber-300 prose-a:text-amber-400' : 'prose-headings:text-white'
              }`}
              style={{ fontSize: `${fontSize}px` }}
            >
              <ReactMarkdown>
                {pages[currentPage] || content}
              </ReactMarkdown>
            </div>
          )}
        </div>

        {/* Notes Side Drawer */}
        {showNotesDrawer && (
          <div className="w-80 border-l border-white/10 bg-black/60 backdrop-blur-xl flex flex-col p-4 z-30 animate-in slide-in-from-right duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Bookmark size={16} className="text-amber-400" />
                <span className="font-semibold text-sm">Notas da Página {currentPage + 1}</span>
              </div>
              <button 
                onClick={() => setShowNotesDrawer(false)}
                className="p-1 text-white/50 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            {/* Note creation */}
            <div className="mt-3 flex flex-col gap-2">
              {selectedText && (
                <div className="p-2 rounded bg-amber-950/40 border border-amber-800/40 text-xs text-amber-200/90 italic line-clamp-2">
                  "{selectedText}"
                </div>
              )}
              <textarea
                value={newNoteText}
                onChange={(e) => setNewNoteText(e.target.value)}
                placeholder="Escreva sua reflexão ou anotação..."
                className="w-full h-20 p-2.5 rounded-lg bg-white/5 border border-white/10 text-xs text-white placeholder-white/40 focus:outline-none focus:border-amber-500/60 resize-none"
              />
              <button
                onClick={handleCreateNote}
                disabled={!newNoteText.trim()}
                className="py-1.5 px-3 bg-amber-500 hover:bg-amber-400 text-black font-semibold text-xs rounded-lg flex items-center justify-center gap-1.5 disabled:opacity-30 transition-all shadow-md"
              >
                <Plus size={14} />
                Salvar Nota
              </button>
            </div>

            {/* Notes List */}
            <div className="flex-1 overflow-y-auto mt-4 space-y-2.5 pr-1">
              {currentNotes.length === 0 ? (
                <div className="text-center py-8 text-white/40 text-xs">
                  Nenhuma anotação nesta página ainda.
                </div>
              ) : (
                currentNotes.map((note) => (
                  <div 
                    key={note.id}
                    className="p-3 rounded-xl bg-white/5 border border-white/10 flex flex-col gap-1.5 relative group"
                  >
                    {note.selectedText && (
                      <p className="text-[11px] text-amber-300/80 italic border-l-2 border-amber-500/50 pl-2">
                        "{note.selectedText}"
                      </p>
                    )}
                    <p className="text-xs text-white/90 leading-normal whitespace-pre-wrap">
                      {note.content}
                    </p>
                    <div className="flex items-center justify-between pt-1 text-[10px] text-white/40">
                      <span>{new Date(note.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      {onDeleteNote && (
                        <button
                          onClick={() => onDeleteNote(note.id)}
                          className="text-red-400/50 hover:text-red-400 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Excluir nota"
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Floating Navigation Bar */}
      {pages.length > 0 && (
        <div className="h-14 border-t border-white/10 px-4 flex items-center justify-between backdrop-blur-md bg-black/40 z-20">
          <button
            onClick={handlePrevPage}
            disabled={currentPage <= 0}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-white hover:bg-white/10 disabled:opacity-20 transition-all"
          >
            <ChevronLeft size={16} />
            Anterior
          </button>

          <div className="flex items-center gap-3">
            <span className="text-xs text-white/70 font-mono font-semibold">
              Capítulo {currentPage + 1} de {pages.length}
            </span>
            <div className="w-32 h-1.5 bg-white/10 rounded-full overflow-hidden hidden sm:block">
              <div 
                className="bg-amber-400 h-full rounded-full transition-all duration-300"
                style={{ width: `${Math.round(((currentPage + 1) / pages.length) * 100)}%` }}
              />
            </div>
            <span className="text-[11px] text-white/50 font-mono hidden sm:inline">
              {Math.round(((currentPage + 1) / pages.length) * 100)}%
            </span>
          </div>

          <button
            onClick={handleNextPage}
            disabled={currentPage >= pages.length - 1}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-white hover:bg-white/10 disabled:opacity-20 transition-all"
          >
            Próximo
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * Splits large markdown content into readable chapter pages
 */
function splitMarkdownIntoPages(markdown: string): string[] {
  // If markdown has level 1 or 2 headers, split by chapters
  const lines = markdown.split('\n');
  const pages: string[] = [];
  let currentChunk: string[] = [];
  let currentLength = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const isHeading = line.startsWith('# ') || (line.startsWith('## ') && currentLength > 1000);

    if (isHeading && currentChunk.length > 0) {
      pages.push(currentChunk.join('\n'));
      currentChunk = [line];
      currentLength = line.length;
    } else {
      currentChunk.push(line);
      currentLength += line.length;

      // If chunk is over 3500 characters and hits an empty line, split
      if (currentLength > 3500 && line.trim() === '') {
        pages.push(currentChunk.join('\n'));
        currentChunk = [];
        currentLength = 0;
      }
    }
  }

  if (currentChunk.length > 0) {
    pages.push(currentChunk.join('\n'));
  }

  return pages.length > 0 ? pages : [markdown];
}
