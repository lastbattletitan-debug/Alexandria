import { useState, useEffect, useRef } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { ChevronLeft, ChevronRight, Loader2, ArrowLeft, Minus, Plus, Rows, FileText, Search, X, Save, Tag, Info, Star, Edit2, Trash2, Check } from 'lucide-react';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { extractTextFromPdf } from '../utils/pdfUtils';

// Configure worker
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PdfViewerProps {
  url: string;
  title?: string;
  onClose?: () => void;
  onSaveSnippet?: (text: string) => void;
  onPageChange?: (page: number, total: number) => void;
  onOpenNotes?: () => void;
  onAddCategory?: (category: string) => void;
  onRemoveCategory?: (category: string) => void;
  onCreateCategory?: (category: string) => void;
  onRenameCategory?: (oldName: string, newName: string) => void;
  onDeleteCategory?: (category: string) => void;
  categories?: string[];
  currentCategories?: string[];
  status?: 'Próximo' | 'Lendo agora' | 'Pausado' | 'Concluído' | 'Descartado';
  onUpdateStatus?: (status: 'Próximo' | 'Lendo agora' | 'Pausado' | 'Concluído' | 'Descartado' | undefined) => void;
  rating?: number;
  onUpdateRating?: (rating: number) => void;
}

export function PdfViewer({ 
  url, 
  title, 
  onClose, 
  onSaveSnippet, 
  onPageChange,
  onOpenNotes,
  onAddCategory,
  onRemoveCategory,
  onCreateCategory,
  onRenameCategory,
  onDeleteCategory,
  categories = [],
  currentCategories = [],
  status,
  onUpdateStatus,
  rating,
  onUpdateRating
}: PdfViewerProps) {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1.0);
  const [inputPage, setInputPage] = useState('1');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'single' | 'scroll'>('single');
  const [isToolbarVisible, setIsToolbarVisible] = useState(false);
  
  // Search state
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<number[]>([]);
  const [currentResultIndex, setCurrentResultIndex] = useState(0);
  const [isSearching, setIsSearching] = useState(false);
  const [pdfText, setPdfText] = useState<{page: number, text: string}[]>([]);

  // Category state
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const [newCategory, setNewCategory] = useState('');
  const [editingCategory, setEditingCategory] = useState<{ oldName: string, newName: string } | null>(null);

  // Details state
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isBottomControlsVisible, setIsBottomControlsVisible] = useState(false);

  // Selection state
  const [selection, setSelection] = useState<string | null>(null);
  const [selectionPosition, setSelectionPosition] = useState<{top: number, left: number} | null>(null);
  const [containerWidth, setContainerWidth] = useState<number | undefined>(undefined);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.clientWidth - 32); // 32px padding
      }
    };
    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  useEffect(() => {
    setPageNumber(1);
    setInputPage('1');
    setError(null);
    setLoading(true);
    setSearchResults([]);
    setSearchQuery('');
    setPdfText([]);
  }, [url]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only navigate if not typing in an input or textarea
      if (
        document.activeElement?.tagName === 'INPUT' || 
        document.activeElement?.tagName === 'TEXTAREA'
      ) {
        return;
      }

      if (viewMode === 'single') {
        if (e.key === 'ArrowRight') {
          changePage(1);
        } else if (e.key === 'ArrowLeft') {
          changePage(-1);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [numPages, viewMode]); // Re-bind if numPages or viewMode changes

  // Handle text selection
  useEffect(() => {
    const handleSelectionChange = () => {
      const sel = window.getSelection();
      if (sel && sel.toString().trim().length > 0 && containerRef.current?.contains(sel.anchorNode)) {
        const range = sel.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        
        // Calculate position relative to viewport but ensure it stays within bounds
        setSelectionPosition({
          top: rect.top - 50, // Position above selection
          left: rect.left + (rect.width / 2) - 60 // Center horizontally
        });
        setSelection(sel.toString().trim());
      } else {
        setSelection(null);
        setSelectionPosition(null);
      }
    };

    document.addEventListener('selectionchange', handleSelectionChange);
    return () => document.removeEventListener('selectionchange', handleSelectionChange);
  }, []);

  const handleSaveSelection = () => {
    if (selection && onSaveSnippet) {
      onSaveSnippet(selection);
      setSelection(null);
      window.getSelection()?.removeAllRanges();
      alert('Trecho salvo com sucesso!');
    }
  };

  // Search functionality
  const performSearch = async () => {
    if (!searchQuery.trim() || !url) return;
    
    setIsSearching(true);
    setSearchResults([]);
    setCurrentResultIndex(0);

    try {
      // Lazy load text if not already loaded
      let textData = pdfText;
      if (textData.length === 0) {
        const response = await fetch(url);
        const blob = await response.blob();
        const arrayBuffer = await blob.arrayBuffer();
        const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
        const pdf = await loadingTask.promise;
        
        const pages = [];
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          const pageText = textContent.items.map((item: any) => item.str).join(' ');
          pages.push({ page: i, text: pageText.toLowerCase() });
        }
        textData = pages;
        setPdfText(pages);
      }

      const query = searchQuery.toLowerCase();
      const results = textData
        .filter(p => p.text.includes(query))
        .map(p => p.page);

      setSearchResults(results);
      if (results.length > 0) {
        setPageNumber(results[0]);
      }
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setIsSearching(false);
    }
  };

  const nextResult = () => {
    if (searchResults.length === 0) return;
    const nextIndex = (currentResultIndex + 1) % searchResults.length;
    setCurrentResultIndex(nextIndex);
    setPageNumber(searchResults[nextIndex]);
  };

  const prevResult = () => {
    if (searchResults.length === 0) return;
    const prevIndex = (currentResultIndex - 1 + searchResults.length) % searchResults.length;
    setCurrentResultIndex(prevIndex);
    setPageNumber(searchResults[prevIndex]);
  };

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
    setLoading(false);
  }

  function onDocumentLoadError(err: Error) {
    console.error('Error loading PDF:', err);
    setError('Erro ao carregar o PDF. O arquivo pode estar corrompido ou indisponível.');
    setLoading(false);
  }

  const changePage = (offset: number) => {
    setPageNumber(prev => {
      const newPage = prev + offset;
      if (numPages && (newPage < 1 || newPage > numPages)) return prev;
      return newPage;
    });
  };

  const onPageChangeRef = useRef(onPageChange);

  useEffect(() => {
    onPageChangeRef.current = onPageChange;
  }, [onPageChange]);

  useEffect(() => {
    setInputPage(pageNumber.toString());
    if (onPageChangeRef.current && numPages) {
      onPageChangeRef.current(pageNumber, numPages);
    }
  }, [pageNumber, numPages]);

  const handlePageSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const page = parseInt(inputPage);
    if (numPages && page >= 1 && page <= numPages) {
      setPageNumber(page);
    } else {
      setInputPage(pageNumber.toString());
    }
  };

  return (
    <div className="flex flex-col h-full bg-bg-main relative" ref={containerRef}>
      {/* Floating Save Button */}
      {selection && selectionPosition && (
        <div 
          className="fixed z-50 animate-in fade-in zoom-in duration-200"
          style={{ top: selectionPosition.top, left: selectionPosition.left }}
        >
          <button
            onClick={handleSaveSelection}
            className="flex items-center gap-2 bg-text-primary text-bg-main px-4 py-2 rounded-full shadow-xl font-bold text-xs hover:scale-105 transition-transform"
          >
            <Save size={14} />
            Salvar Trecho
          </button>
        </div>
      )}

      {/* Header Bar - Always visible on mobile, hidden by default on desktop */}
      <div 
        className="absolute top-0 left-0 right-0 z-40 lg:opacity-0 lg:hover:opacity-100 transition-opacity duration-300"
        style={{ opacity: (typeof window !== 'undefined' && window.innerWidth < 1024) || isToolbarVisible || isSearchOpen || isCategoryOpen || isDetailsOpen ? 1 : undefined }}
        onMouseEnter={() => setIsToolbarVisible(true)}
        onMouseLeave={() => setIsToolbarVisible(false)}
      >
        {/* Trigger area to ensure hover works easily */}
        <div className="h-4 w-full absolute -top-4 left-0" />
        
        <div className="flex items-center justify-between px-4 lg:px-6 py-3 lg:py-4 bg-bg-sidebar/95 backdrop-blur-md border-b border-border-subtle shadow-lg gap-2 lg:gap-4">
          {/* Left: Back & Title */}
          <div className="flex items-center gap-2 lg:gap-4 min-w-0">
            {onClose && (
              <button
                onClick={onClose}
                className="p-2 hover:bg-border-subtle rounded-xl text-text-muted hover:text-text-primary transition-colors shrink-0"
              >
                <ArrowLeft className="w-[18px] h-[18px] lg:w-[20px] lg:h-[20px]" />
              </button>
            )}
            <h2 className="font-bold text-text-primary text-xs lg:text-sm truncate max-w-[120px] lg:max-w-md" title={title}>
              {title || 'Documento PDF'}
            </h2>
          </div>

          {/* Center: Page Navigation (Only visible in Single Page Mode) */}
          {viewMode === 'single' && (
            <div className="flex items-center gap-1 lg:gap-2 justify-center">
              <button
                onClick={() => changePage(-1)}
                disabled={pageNumber <= 1}
                className="p-1.5 lg:p-2 hover:bg-border-subtle rounded-xl text-text-muted hover:text-text-primary disabled:opacity-30 transition-colors"
              >
                <ChevronLeft className="w-[16px] h-[16px] lg:w-[18px] lg:h-[18px]" />
              </button>
              
              <form onSubmit={handlePageSubmit} className="flex items-center gap-1 lg:gap-2 bg-bg-card border border-border-subtle rounded-lg px-2 lg:px-3 py-1 lg:py-1.5">
                <input
                  type="text"
                  value={inputPage}
                  onChange={(e) => setInputPage(e.target.value)}
                  className="w-6 lg:w-8 bg-transparent text-center text-[10px] lg:text-xs font-bold text-text-primary focus:outline-none" />
                <span className="text-text-muted text-[10px] lg:text-xs">/ {numPages || '--'}</span>
              </form>

              <button
                onClick={() => changePage(1)}
                disabled={!numPages || pageNumber >= numPages}
                className="p-1.5 lg:p-2 hover:bg-border-subtle rounded-xl text-text-muted hover:text-text-primary disabled:opacity-30 transition-colors"
              >
                <ChevronRight className="w-[16px] h-[16px] lg:w-[18px] lg:h-[18px]" />
              </button>
            </div>
          )}

          {/* Right: Controls */}
          <div className="flex items-center gap-2 lg:gap-4 justify-end flex-1">
            {/* Notes Button */}
            {onOpenNotes && (
              <button
                onClick={onOpenNotes}
                className="p-2 bg-bg-card border border-border-subtle rounded-xl text-text-muted hover:text-text-primary transition-colors"
                title="Notas"
              >
                <FileText className="w-[14px] h-[14px] lg:w-[16px] lg:h-[16px]" />
              </button>
            )}

            {/* Details Button */}
            {onUpdateStatus && (
              <div className="relative">
                <button
                  onClick={() => setIsDetailsOpen(!isDetailsOpen)}
                  className={`p-2 rounded-xl transition-colors ${isDetailsOpen ? 'bg-text-primary text-bg-main' : 'bg-bg-card border border-border-subtle text-text-muted hover:text-text-primary'}`}
                  title="Detalhes do Livro"
                >
                  <Info className="w-[14px] h-[14px] lg:w-[16px] lg:h-[16px]" />
                </button>
                
                {isDetailsOpen && (
                  <div className="absolute top-full right-0 mt-2 w-56 lg:w-64 bg-bg-card border border-border-strong rounded-xl shadow-2xl p-3 lg:p-4 z-30 flex flex-col gap-4 lg:gap-6">
                    {/* Status */}
                    <div>
                      <p className="text-[9px] lg:text-[10px] font-bold text-text-muted uppercase tracking-widest mb-2 lg:mb-3">Status</p>
                      <div className="flex flex-col gap-1.5 lg:gap-2">
                        {['Próximo', 'Lendo agora', 'Pausado', 'Concluído', 'Descartado'].map((s) => (
                          <button
                            key={s}
                            onClick={() => {
                              if (status === s) {
                                onUpdateStatus(undefined);
                              } else {
                                onUpdateStatus(s as any);
                              }
                              setIsDetailsOpen(false);
                            }}
                            className={`px-3 py-1.5 lg:py-2 rounded-lg text-[10px] lg:text-xs font-medium text-left transition-colors ${status === s ? 'bg-white text-black' : 'bg-bg-main text-text-primary hover:bg-border-subtle'}`}
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Rating */}
                    {onUpdateRating && (
                      <div>
                        <p className="text-[9px] lg:text-[10px] font-bold text-text-muted uppercase tracking-widest mb-2 lg:mb-3">Avaliação</p>
                        <div className="flex gap-1 justify-center bg-bg-main p-1.5 lg:p-2 rounded-xl border border-border-subtle">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              onClick={() => onUpdateRating(star)}
                              className="p-1 hover:scale-110 transition-transform"
                            >
                              <Star   
                                className={`w-[16px] h-[16px] lg:w-[20px] lg:h-[20px] ${star <= (rating || 0) ? "fill-yellow-400 text-yellow-400" : "text-border-strong"}`} 
                              />
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Category Button */}
            {onAddCategory && (
              <div className="relative">
                <button
                  onClick={() => setIsCategoryOpen(!isCategoryOpen)}
                  className={`p-2 rounded-xl transition-colors ${isCategoryOpen ? 'bg-text-primary text-bg-main' : 'bg-bg-card border border-border-subtle text-text-muted hover:text-text-primary'}`}
                  title="Categoria"
                >
                  <Tag className="w-[14px] h-[14px] lg:w-[16px] lg:h-[16px]" />
                </button>
                
                {isCategoryOpen && (
                  <div className="absolute top-full right-0 mt-2 w-64 lg:w-72 bg-bg-card border border-border-strong rounded-xl shadow-2xl p-3 lg:p-4 z-30 flex flex-col gap-3 lg:gap-4">
                    <div>
                      <div className="flex gap-2">
                        <input 
                          type="text" 
                          value={newCategory}
                          onChange={(e) => setNewCategory(e.target.value)}
                          placeholder="Nova categoria..."
                          className="flex-1 bg-bg-main border border-border-subtle rounded-lg px-2 py-1.5 text-[10px] lg:text-xs text-text-primary focus:outline-none focus:border-border-strong" />
                        <button 
                          onClick={() => {
                            if (newCategory.trim()) {
                              if (onCreateCategory) {
                                onCreateCategory(newCategory.trim());
                              }
                              setNewCategory('');
                            }
                          }}
                          className="p-1.5 bg-text-primary text-bg-main rounded-lg hover:opacity-90"
                        >
                          <Plus className="w-[12px] h-[12px] lg:w-[14px] lg:h-[14px]" />
                        </button>
                      </div>
                    </div>
                    
                    {/* Current Categories (Tags) */}
                    {currentCategories.length > 0 && (
                      <div>
                        <p className="text-[9px] lg:text-[10px] font-bold text-text-muted uppercase tracking-widest mb-2">Categorias</p>
                        <div className="flex flex-wrap gap-1.5 lg:gap-2">
                          {currentCategories.map(cat => (
                            <div key={cat} className="flex items-center gap-1 bg-text-primary text-bg-main px-2 py-0.5 lg:py-1 rounded-md text-[10px] lg:text-xs">
                              <span>{cat}</span>
                              {onRemoveCategory && (
                                <button 
                                  onClick={() => onRemoveCategory(cat)}
                                  className="hover:text-red-300"
                                >
                                  <X className="w-[10px] h-[10px] lg:w-[12px] lg:h-[12px]" />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {categories.length > 0 && (
                      <div>
                        <p className="text-[9px] lg:text-[10px] font-bold text-text-muted uppercase tracking-widest mb-2">Existentes</p>
                        <div className="flex flex-col gap-1 lg:gap-2 max-h-40 lg:max-h-48 overflow-y-auto">
                          {categories.filter(c => !currentCategories.includes(c)).map(cat => (
                            <div key={cat} className="group flex items-center justify-between p-1.5 lg:p-2 rounded-lg hover:bg-bg-main transition-colors">
                              {editingCategory?.oldName === cat ? (
                                <div className="flex items-center gap-2 flex-1">
                                  <input
                                    type="text"
                                    value={editingCategory.newName}
                                    onChange={(e) => setEditingCategory({ ...editingCategory, newName: e.target.value })}
                                    className="flex-1 bg-bg-card border border-border-subtle rounded px-2 py-1 text-[10px] lg:text-xs text-text-primary"
                                    autoFocus
                                  />
                                  <button
                                    onClick={() => {
                                      if (editingCategory.newName.trim() && onRenameCategory) {
                                        onRenameCategory(editingCategory.oldName, editingCategory.newName.trim());
                                        setEditingCategory(null);
                                      }
                                    }}
                                    className="p-1 text-green-400 hover:bg-white/5 rounded"
                                  >
                                    <Check className="w-[10px] h-[10px] lg:w-[12px] lg:h-[12px]" />
                                  </button>
                                  <button
                                    onClick={() => setEditingCategory(null)}
                                    className="p-1 text-red-400 hover:bg-white/5 rounded"
                                  >
                                    <X className="w-[10px] h-[10px] lg:w-[12px] lg:h-[12px]" />
                                  </button>
                                </div>
                              ) : (
                                <>
                                  <button
                                    onClick={() => {
                                      onAddCategory(cat);
                                      setIsCategoryOpen(false);
                                    }}
                                    className="text-[10px] lg:text-xs text-text-primary hover:text-white flex-1 text-left"
                                  >
                                    {cat}
                                  </button>
                                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    {onRenameCategory && (
                                      <button
                                        onClick={() => setEditingCategory({ oldName: cat, newName: cat })}
                                        className="p-1 text-text-muted hover:text-text-primary hover:bg-white/5 rounded"
                                        title="Renomear"
                                      >
                                        <Edit2 className="w-[10px] h-[10px] lg:w-[12px] lg:h-[12px]" />
                                      </button>
                                    )}
                                    {onDeleteCategory && (
                                      <button
                                        onClick={() => {
                                          if (confirm(`Tem certeza que deseja excluir a categoria "${cat}"?`)) {
                                            onDeleteCategory(cat);
                                          }
                                        }}
                                        className="p-1 text-text-muted hover:text-red-400 hover:bg-white/5 rounded"
                                        title="Excluir"
                                      >
                                        <Trash2 className="w-[10px] h-[10px] lg:w-[12px] lg:h-[12px]" />
                                      </button>
                                    )}
                                  </div>
                                </>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Search Toggle */}
            <div className="relative">
               <button
                onClick={() => setIsSearchOpen(!isSearchOpen)}
                className={`p-2 rounded-xl transition-colors ${isSearchOpen ? 'bg-text-primary text-bg-main' : 'bg-bg-card border border-border-subtle text-text-muted hover:text-text-primary'}`}
                title="Pesquisar"
              >
                <Search className="w-[14px] h-[14px] lg:w-[16px] lg:h-[16px]" />
              </button>
              
              {isSearchOpen && (
                  <div className="absolute top-full right-0 mt-2 w-64 lg:w-72 bg-bg-card border border-border-strong rounded-xl shadow-2xl p-2 lg:p-3 z-30 flex flex-col gap-2">
                      <div className="flex items-center gap-2">
                          <input 
                              type="text" 
                              value={searchQuery}
                              onChange={(e) => setSearchQuery(e.target.value)}
                              onKeyDown={(e) => e.key === 'Enter' && performSearch()}
                              placeholder="Buscar..."
                              className="flex-1 bg-bg-main border border-border-subtle rounded-lg px-2 lg:px-3 py-1 lg:py-1.5 text-[10px] lg:text-sm text-text-primary focus:outline-none focus:border-border-strong"
                              autoFocus
                          />
                          <button 
                              onClick={performSearch}
                              disabled={isSearching}
                              className="p-1.5 bg-text-primary text-bg-main rounded-lg hover:opacity-90 disabled:opacity-50"
                          >
                              {isSearching ? <Loader2 className="w-[12px] h-[12px] lg:w-[14px] lg:h-[14px] animate-spin" /> : <Search className="w-[12px] h-[12px] lg:w-[14px] lg:h-[14px]" />}
                          </button>
                      </div>
                      {searchResults.length > 0 && (
                          <div className="flex items-center justify-between text-[10px] lg:text-xs text-text-muted px-1">
                              <span>{currentResultIndex + 1} de {searchResults.length}</span>
                              <div className="flex gap-1">
                                  <button onClick={prevResult} className="p-1 hover:bg-border-subtle rounded"><ChevronLeft className="w-[12px] h-[12px] lg:w-[14px] lg:h-[14px]" /></button>
                                  <button onClick={nextResult} className="p-1 hover:bg-border-subtle rounded"><ChevronRight className="w-[12px] h-[12px] lg:w-[14px] lg:h-[14px]" /></button>
                              </div>
                          </div>
                      )}
                  </div>
              )}
            </div>

          {/* View Mode Toggle - Hidden on very small screens */}
          <div className="hidden sm:flex items-center bg-bg-card border border-border-subtle rounded-xl p-1">
            <button
              onClick={() => setViewMode('single')}
              className={`p-2 rounded-lg transition-colors ${viewMode === 'single' ? 'bg-border-subtle text-text-primary' : 'text-text-muted hover:text-text-primary'}`}
              title="Página Única"
            >
              <FileText className="w-[14px] h-[14px] lg:w-[16px] lg:h-[16px]" />
            </button>
            <button
              onClick={() => setViewMode('scroll')}
              className={`p-2 rounded-lg transition-colors ${viewMode === 'scroll' ? 'bg-border-subtle text-text-primary' : 'text-text-muted hover:text-text-primary'}`}
              title="Rolagem Contínua"
            >
              <Rows className="w-[14px] h-[14px] lg:w-[16px] lg:h-[16px]" />
            </button>
          </div>

          {/* Zoom Controls - Hidden on very small screens */}
          <div className="hidden md:flex items-center gap-3 bg-bg-card border border-border-subtle rounded-xl p-2 px-3">
            <button
              onClick={() => setScale(s => Math.max(0.5, s - 0.1))}
              className="text-text-muted hover:text-text-primary transition-colors"
            >
              <Minus className="w-[14px] h-[14px] lg:w-[16px] lg:h-[16px]" />
            </button>
            
            <input 
              type="range" 
              min="0.5" 
              max="3" 
              step="0.1" 
              value={scale} 
              onChange={(e) => setScale(parseFloat(e.target.value))}
              className="w-16 lg:w-24 h-1 bg-border-subtle rounded-lg appearance-none cursor-pointer accent-text-primary" />
            
            <button
              onClick={() => setScale(s => Math.min(3, s + 0.1))}
              className="text-text-muted hover:text-text-primary transition-colors"
            >
              <Plus className="w-[14px] h-[14px] lg:w-[16px] lg:h-[16px]" />
            </button>
            <span className="text-[10px] lg:text-xs font-bold text-text-primary w-8 lg:w-10 text-right select-none">
              {Math.round(scale * 100)}%
            </span>
          </div>
        </div>
      </div>
    </div>

      {/* PDF Content */}
      <div className="flex-1 overflow-auto flex justify-center p-4 lg:p-8 bg-bg-main/50 relative">
        {loading && !error && (
            <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
                <div className="bg-bg-card/80 backdrop-blur-sm p-4 rounded-xl flex items-center gap-3 border border-border-subtle shadow-lg">
                    <Loader2 className="animate-spin text-text-primary" />
                    <span className="text-sm font-medium text-text-primary">Carregando documento...</span>
                </div>
            </div>
        )}
        
        {error ? (
            <div className="flex flex-col items-center justify-center h-full text-red-400 gap-2">
                <p>{error}</p>
                <button 
                    onClick={onClose}
                    className="px-4 py-2 bg-bg-card border border-border-subtle rounded-lg text-text-primary hover:bg-border-subtle transition-colors text-sm"
                >
                    Fechar
                </button>
            </div>
        ) : (
            <div className={`shadow-2xl border border-border-subtle bg-white transition-all duration-200 ${viewMode === 'scroll' ? 'mb-8' : ''}`}>
                <Document
                    file={url}
                    onLoadSuccess={onDocumentLoadSuccess}
                    onLoadError={onDocumentLoadError}
                    loading={null}
                    className="flex flex-col items-center"
                >
                    {viewMode === 'single' ? (
                        <Page 
                            pageNumber={pageNumber} 
                            scale={scale} 
                            width={containerWidth}
                            renderTextLayer={true}
                            renderAnnotationLayer={true}
                            className="max-w-full" />
                    ) : (
                        Array.from(new Array(numPages), (el, index) => (
                            <Page 
                                key={`page_${index + 1}`}
                                pageNumber={index + 1} 
                                scale={scale} 
                                width={containerWidth}
                                renderTextLayer={true}
                                renderAnnotationLayer={true}
                                className="max-w-full mb-2 border-b border-gray-200 last:border-0" />
                        ))
                    )}
                </Document>
            </div>
        )}

        {/* Floating Bottom Page Controls */}
        {viewMode === 'single' && !loading && !error && (
          <div 
            className="absolute bottom-6 lg:bottom-12 left-1/2 -translate-x-1/2 z-40 transition-all duration-300 lg:opacity-0 lg:hover:opacity-100"
            style={{ 
              opacity: (typeof window !== 'undefined' && window.innerWidth < 1024) || isBottomControlsVisible ? 1 : undefined,
              transform: `translateX(-50%) translateY(${((typeof window !== 'undefined' && window.innerWidth < 1024) || isBottomControlsVisible) ? '0' : '10px'})`
            }}
            onMouseEnter={() => setIsBottomControlsVisible(true)}
            onMouseLeave={() => setIsBottomControlsVisible(false)}
          >
            {/* Trigger area */}
            <div className="absolute -top-12 left-0 right-0 h-12" />
            
            <div className="flex items-center gap-1 bg-black/90 backdrop-blur-xl border border-white/10 rounded-xl px-2 py-1 shadow-2xl">
              <button
                onClick={() => changePage(-1)}
                disabled={pageNumber <= 1}
                className="p-1.5 hover:bg-white/10 rounded-lg text-white/40 hover:text-white disabled:opacity-10 transition-colors"
              >
                <ChevronLeft size={14} />
              </button>
              
              <div className="flex items-center gap-2 px-3 py-1 bg-white/5 rounded-lg border border-white/5">
                <span className="text-[11px] font-bold text-white tracking-tight">{pageNumber}</span>
                <span className="text-white/20 text-[10px]">/</span>
                <span className="text-white/40 text-[11px] font-medium">{numPages || '--'}</span>
              </div>

              <button
                onClick={() => changePage(1)}
                disabled={!numPages || pageNumber >= numPages}
                className="p-1.5 hover:bg-white/10 rounded-lg text-white/40 hover:text-white disabled:opacity-10 transition-colors"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
