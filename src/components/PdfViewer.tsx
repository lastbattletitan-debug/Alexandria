import { useState, useEffect, useRef, useCallback } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { ChevronLeft, ChevronRight, Loader2, ArrowLeft, Minus, Plus, Rows, FileText, Search, X, Save, Tag, Info, Star, Edit2, Trash2, Check, BookOpen, Volume2, VolumeX, Maximize2, Minimize2 } from 'lucide-react';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { extractTextFromPdf } from '../utils/pdfUtils';
import { Book3DViewer } from './Book3DViewer';
import { getPdfFile, savePdfFile } from '../utils/pdfStorage';

// Configure worker
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PdfViewerProps {
  bookId?: string;
  url: string;
  title?: string;
  initialPage?: number;
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
  bookId,
  url, 
  title, 
  initialPage = 1,
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
  const [resolvedUrl, setResolvedUrl] = useState<string>(url);
  const [pdfDoc, setPdfDoc] = useState<any>(null);

  useEffect(() => {
    let active = true;
    async function resolvePdfUrl() {
      if (bookId) {
        const storedBlob = await getPdfFile(bookId);
        if (storedBlob && active) {
          const blobUrl = URL.createObjectURL(storedBlob);
          setResolvedUrl(blobUrl);
          return;
        }
      }
      setResolvedUrl(url);
    }
    resolvePdfUrl();
    return () => {
      active = false;
    };
  }, [bookId, url]);

  // Load PDF Document Proxy whenever resolvedUrl changes so 3D Book viewer always receives a valid pdfDoc
  useEffect(() => {
    let active = true;
    if (!resolvedUrl) return;

    setLoading(true);
    setError(null);

    const loadingTask = pdfjs.getDocument(resolvedUrl);
    loadingTask.promise.then((doc) => {
      if (!active) return;
      setPdfDoc(doc);
      setNumPages(doc.numPages);
      setLoading(false);

      // Detect aspect ratio from first page
      doc.getPage(1).then((page: any) => {
        if (!active) return;
        const vp = page.getViewport({ scale: 1.0 });
        if (vp.width && vp.height) {
          setPdfAspectRatio(vp.width / vp.height);
        }
      }).catch(() => {});
    }).catch((err) => {
      console.error('Error loading PDF document in PdfViewer:', err);
      if (active) {
        setError('O arquivo PDF não pôde ser carregado. Por favor, selecione-o novamente.');
        setLoading(false);
      }
    });

    return () => {
      active = false;
    };
  }, [resolvedUrl]);
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(initialPage || 1);
  const [scale, setScale] = useState(1.0);
  const [inputPage, setInputPage] = useState((initialPage || 1).toString());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'single' | 'scroll' | 'book3d'>('book3d');
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

  // 3D Book Mode Controls State
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [paperTheme, setPaperTheme] = useState<'vintage' | 'clean' | 'night'>('vintage');
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen?.().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.().catch(() => {});
      setIsFullscreen(false);
    }
  };

  // Selection state
  const [selection, setSelection] = useState<string | null>(null);
  const [selectionPosition, setSelectionPosition] = useState<{top: number, left: number} | null>(null);
  const [pdfAspectRatio, setPdfAspectRatio] = useState<number | null>(null);
  const [pageSize, setPageSize] = useState<{ width: number }>({ width: 650 });
  const containerRef = useRef<HTMLDivElement>(null);

  const updateDimensions = useCallback(() => {
    if (!containerRef.current) return;
    const availWidth = Math.max(280, containerRef.current.clientWidth - 48);
    const availHeight = Math.max(300, containerRef.current.clientHeight - 80);
    const ratio = pdfAspectRatio || 0.707; // Default to standard document aspect ratio

    if (viewMode === 'single') {
      // In Single (Lado) mode: Fit page cleanly into both viewport width and height at 100% zoom
      let w = availWidth;
      let h = w / ratio;
      if (h > availHeight) {
        h = availHeight;
        w = h * ratio;
      }
      setPageSize({ width: Math.floor(w) });
    } else {
      // In Scroll (Cima) mode: Comfortable centered reading width respecting landscape or portrait
      let maxScrollW = ratio > 1.1 
        ? Math.min(availWidth, Math.min(availHeight * ratio * 0.9, 900))
        : Math.min(availWidth, 700);
      setPageSize({ width: Math.floor(maxScrollW) });
    }
  }, [pdfAspectRatio, viewMode]);

  useEffect(() => {
    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, [updateDimensions]);

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
    if (!searchQuery.trim() || !resolvedUrl) return;
    
    setIsSearching(true);
    setSearchResults([]);
    setCurrentResultIndex(0);

    try {
      // Lazy load text if not already loaded
      let textData = pdfText;
      if (textData.length === 0) {
        const response = await fetch(resolvedUrl);
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

  function onDocumentLoadSuccess(pdf: any) {
    setNumPages(pdf.numPages);
    setPdfDoc(pdf);
    setLoading(false);
    
    // Detect aspect ratio from the first page
    pdf.getPage(1).then((page: any) => {
      const vp = page.getViewport({ scale: 1.0 });
      if (vp.width && vp.height) {
        setPdfAspectRatio(vp.width / vp.height);
      }
    }).catch((err: any) => {
      console.error('Error getting page viewport ratio:', err);
    });
  }

  function onDocumentLoadError(err: Error) {
    console.error('Error loading PDF:', err);
    setError('O link do PDF expirou ou o arquivo não está acessível nesta sessão.');
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

      {/* Top Hover Trigger Area */}
      <div 
        className="absolute top-0 left-0 right-0 h-12 z-30 pointer-events-auto"
        onMouseEnter={() => setIsToolbarVisible(true)}
      />

      {/* Header Bar - Auto-hides by default and appears on hover / interaction */}
      <div 
        className={`absolute top-0 left-0 right-0 z-40 transition-all duration-300 ease-out transform ${
          isToolbarVisible || isSearchOpen || isCategoryOpen || isDetailsOpen 
            ? 'opacity-100 translate-y-0 pointer-events-auto shadow-2xl' 
            : 'opacity-0 -translate-y-full pointer-events-none'
        }`}
        onMouseEnter={() => setIsToolbarVisible(true)}
        onMouseLeave={() => setIsToolbarVisible(false)}
      >
        <div className="flex items-center justify-between px-4 lg:px-6 py-2.5 lg:py-3 bg-bg-sidebar/95 backdrop-blur-xl border-b border-border-subtle shadow-xl gap-2 lg:gap-4">
          {/* Left: Back & Title */}
          <div className="flex items-center gap-2 lg:gap-4 min-w-0">
            {onClose && (
              <button
                onClick={onClose}
                className="p-2 hover:bg-border-subtle rounded-xl text-text-muted hover:text-text-primary transition-colors shrink-0"
                title="Voltar"
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

          {/* Mode Switcher */}
          <div className="hidden sm:flex items-center bg-bg-card border border-border-subtle rounded-xl p-1 gap-0.5">
            <button
              onClick={() => setViewMode('book3d')}
              className={`p-2 rounded-lg transition-all flex items-center gap-1.5 ${viewMode === 'book3d' ? 'bg-amber-500/20 text-amber-300 font-semibold shadow-sm' : 'text-text-muted hover:text-text-primary'}`}
              title="Livro Físico 3D (Folhear Páginas)"
            >
              <BookOpen className="w-[14px] h-[14px] lg:w-[16px] lg:h-[16px]" />
              <span className="text-[10px] hidden md:inline">3D</span>
            </button>
            <button
              onClick={() => setViewMode('single')}
              className={`p-2 rounded-lg transition-all flex items-center gap-1.5 ${viewMode === 'single' ? 'bg-border-subtle text-text-primary font-semibold' : 'text-text-muted hover:text-text-primary'}`}
              title="Página Única (Arrastar para o lado)"
            >
              <FileText className="w-[14px] h-[14px] lg:w-[16px] lg:h-[16px]" />
              <span className="text-[10px] hidden md:inline">Lado</span>
            </button>
            <button
              onClick={() => setViewMode('scroll')}
              className={`p-2 rounded-lg transition-all flex items-center gap-1.5 ${viewMode === 'scroll' ? 'bg-border-subtle text-text-primary font-semibold' : 'text-text-muted hover:text-text-primary'}`}
              title="Rolagem Contínua (Arrastar para cima)"
            >
              <Rows className="w-[14px] h-[14px] lg:w-[16px] lg:h-[16px]" />
              <span className="text-[10px] hidden md:inline">Cima</span>
            </button>
          </div>

          {/* 3D Mode Controls or 2D Zoom Controls */}
          {viewMode === 'book3d' ? (
            <div className="flex items-center gap-1.5 lg:gap-2">
              {/* Sound Toggle */}
              <button
                onClick={() => setSoundEnabled(!soundEnabled)}
                className={`p-2 rounded-xl border transition-all ${
                  soundEnabled 
                    ? 'bg-amber-500/15 border-amber-500/30 text-amber-300' 
                    : 'bg-bg-card border-border-subtle text-text-muted hover:text-text-primary'
                }`}
                title={soundEnabled ? "Som ativado" : "Som desativado"}
              >
                {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
              </button>

              {/* Paper Themes */}
              <div className="hidden sm:flex items-center bg-bg-card border border-border-subtle rounded-xl p-1 gap-0.5">
                <button
                  onClick={() => setPaperTheme('vintage')}
                  className={`px-2.5 py-1 rounded-lg text-[10px] lg:text-xs font-medium transition-all ${
                    paperTheme === 'vintage' ? 'bg-amber-800/40 text-amber-200 font-bold' : 'text-text-muted hover:text-text-primary'
                  }`}
                >
                  Vintage
                </button>
                <button
                  onClick={() => setPaperTheme('clean')}
                  className={`px-2.5 py-1 rounded-lg text-[10px] lg:text-xs font-medium transition-all ${
                    paperTheme === 'clean' ? 'bg-white/15 text-white font-bold' : 'text-text-muted hover:text-text-primary'
                  }`}
                >
                  Clean
                </button>
                <button
                  onClick={() => setPaperTheme('night')}
                  className={`px-2.5 py-1 rounded-lg text-[10px] lg:text-xs font-medium transition-all ${
                    paperTheme === 'night' ? 'bg-blue-900/40 text-blue-200 font-bold' : 'text-text-muted hover:text-text-primary'
                  }`}
                >
                  Dark
                </button>
              </div>

              {/* Fullscreen */}
              <button
                onClick={toggleFullscreen}
                className="p-2 rounded-xl bg-bg-card border border-border-subtle text-text-muted hover:text-text-primary transition-colors"
                title="Tela cheia"
              >
                {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
              </button>
            </div>
          ) : (
            /* Zoom Controls - Hidden on very small screens */
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
          )}
        </div>
      </div>
    </div>

      {/* Content Rendering based on ViewMode or Error */}
      {error ? (
        <div className="flex-1 flex flex-col items-center justify-center text-text-primary gap-4 p-6 text-center max-w-md my-auto mx-auto z-30">
          <div className="w-14 h-14 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center text-2xl font-bold shadow-lg">!</div>
          <div>
            <p className="font-bold text-base mb-1.5">Arquivo PDF não encontrado ou expirado</p>
            <p className="text-xs text-text-muted leading-relaxed">Sessões anteriores do navegador expiram links temporários de PDF. Selecione o arquivo PDF do seu livro para carregá-lo novamente com todas as páginas.</p>
          </div>
          <label className="px-5 py-3 bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs rounded-xl cursor-pointer shadow-xl transition-all flex items-center gap-2">
            Selecionar arquivo PDF
            <input 
              type="file" 
              accept=".pdf" 
              className="hidden" 
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (file && bookId) {
                  await savePdfFile(bookId, file);
                  const freshUrl = URL.createObjectURL(file);
                  setResolvedUrl(freshUrl);
                  setLoading(true);
                  setError(null);
                }
              }} 
            />
          </label>
          <button 
            onClick={onClose}
            className="px-4 py-2 bg-bg-card border border-border-subtle rounded-xl text-text-muted hover:text-text-primary transition-colors text-xs"
          >
            Voltar à Estante
          </button>
        </div>
      ) : viewMode === 'book3d' ? (
        <div className="flex-1 w-full h-full relative">
          {/* Hidden Document loader to retrieve pdf proxy & page count */}
          <div className="hidden">
            <Document
              file={resolvedUrl}
              onLoadSuccess={onDocumentLoadSuccess}
              onLoadError={onDocumentLoadError}
              loading={null}
            />
          </div>
          <Book3DViewer 
            pdfDocument={pdfDoc}
            pdfPagesCount={numPages || undefined}
            pdfUrl={resolvedUrl}
            isLoading={loading || (!pdfDoc && !resolvedUrl && !error)}
            soundEnabled={soundEnabled}
            paperTheme={paperTheme}
            title={title}
            initialPage={pageNumber - 1}
            onPageChange={(page, total) => {
              setPageNumber(page);
              setInputPage(page.toString());
              if (onPageChangeRef.current && total) {
                onPageChangeRef.current(page, total);
              }
            }}
          />
        </div>
      ) : (
        <div className="flex-1 overflow-auto flex justify-center p-4 lg:p-8 bg-bg-main/50 relative">
          {loading && !error && (
            <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
              <div className="bg-bg-card/80 backdrop-blur-sm p-4 rounded-xl flex items-center gap-3 border border-border-subtle shadow-lg">
                <Loader2 className="animate-spin text-text-primary" />
                <span className="text-sm font-medium text-text-primary">Carregando documento...</span>
              </div>
            </div>
          )}
          
          <div className={`shadow-2xl border border-border-subtle bg-white transition-all duration-200 ${viewMode === 'scroll' ? 'mb-8' : ''}`}>
            <Document
                file={resolvedUrl}
                onLoadSuccess={onDocumentLoadSuccess}
                onLoadError={onDocumentLoadError}
                loading={null}
                className="flex flex-col items-center"
            >
                      {viewMode === 'single' ? (
                          <Page 
                              pageNumber={pageNumber} 
                              scale={scale} 
                              width={pageSize.width}
                              renderTextLayer={true}
                              renderAnnotationLayer={true}
                              className="max-w-full" />
                      ) : (
                          Array.from(new Array(numPages), (el, index) => (
                              <Page 
                                  key={`page_${index + 1}`}
                                  pageNumber={index + 1} 
                                  scale={scale} 
                                  width={pageSize.width}
                                  renderTextLayer={true}
                                  renderAnnotationLayer={true}
                                  className="max-w-full mb-2 border-b border-gray-200 last:border-0" />
                          ))
                      )}
                  </Document>
              </div>

          {/* Floating Bottom Page Controls for single page mode */}
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
      )}
    </div>
  );
}
