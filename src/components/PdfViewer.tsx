import { useState, useEffect, useRef } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { ChevronLeft, ChevronRight, Loader2, ArrowLeft, Minus, Plus, Rows, FileText, Search, X, Save, Tag } from 'lucide-react';
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
  onUpdateCategory?: (category: string) => void;
  categories?: string[];
  currentCategory?: string;
}

export function PdfViewer({ 
  url, 
  title, 
  onClose, 
  onSaveSnippet, 
  onPageChange,
  onOpenNotes,
  onUpdateCategory,
  categories = [],
  currentCategory
}: PdfViewerProps) {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1.0);
  const [inputPage, setInputPage] = useState('1');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'single' | 'scroll'>('single');
  
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

  // Selection state
  const [selection, setSelection] = useState<string | null>(null);
  const [selectionPosition, setSelectionPosition] = useState<{top: number, left: number} | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setPageNumber(1);
    setInputPage('1');
    setError(null);
    setLoading(true);
    setSearchResults([]);
    setSearchQuery('');
    setPdfText([]);
  }, [url]);

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

      {/* Header Bar */}
      <div className="flex items-center justify-between px-6 py-4 bg-bg-sidebar border-b border-border-subtle shrink-0 z-10 shadow-sm gap-4">
        {/* Left: Back & Title */}
        <div className="flex items-center gap-4 min-w-0">
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 hover:bg-border-subtle rounded-xl text-text-muted hover:text-text-primary transition-colors shrink-0"
            >
              <ArrowLeft size={20} />
            </button>
          )}
          <h2 className="font-bold text-text-primary text-sm truncate max-w-[200px] lg:max-w-md" title={title}>
            {title || 'Documento PDF'}
          </h2>
        </div>

        {/* Center: Page Navigation (Only visible in Single Page Mode) */}
        {viewMode === 'single' && (
          <div className="flex items-center gap-2 justify-center">
            <button
              onClick={() => changePage(-1)}
              disabled={pageNumber <= 1}
              className="p-2 hover:bg-border-subtle rounded-xl text-text-muted hover:text-text-primary disabled:opacity-30 transition-colors"
            >
              <ChevronLeft size={18} />
            </button>
            
            <form onSubmit={handlePageSubmit} className="flex items-center gap-2 bg-bg-card border border-border-subtle rounded-lg px-3 py-1.5">
              <input
                type="text"
                value={inputPage}
                onChange={(e) => setInputPage(e.target.value)}
                className="w-8 bg-transparent text-center text-xs font-bold text-text-primary focus:outline-none"
              />
              <span className="text-text-muted text-xs">/ {numPages || '--'}</span>
            </form>

            <button
              onClick={() => changePage(1)}
              disabled={!numPages || pageNumber >= numPages}
              className="p-2 hover:bg-border-subtle rounded-xl text-text-muted hover:text-text-primary disabled:opacity-30 transition-colors"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        )}

        {/* Right: Controls */}
        <div className="flex items-center gap-4 justify-end flex-1">
          {/* Notes Button */}
          {onOpenNotes && (
            <button
              onClick={onOpenNotes}
              className="p-2 bg-bg-card border border-border-subtle rounded-xl text-text-muted hover:text-text-primary transition-colors"
              title="Notas"
            >
              <FileText size={16} />
            </button>
          )}

          {/* Category Button */}
          {onUpdateCategory && (
            <div className="relative">
              <button
                onClick={() => setIsCategoryOpen(!isCategoryOpen)}
                className={`p-2 rounded-xl transition-colors ${isCategoryOpen ? 'bg-text-primary text-bg-main' : 'bg-bg-card border border-border-subtle text-text-muted hover:text-text-primary'}`}
                title="Categoria"
              >
                <Tag size={16} />
              </button>
              
              {isCategoryOpen && (
                <div className="absolute top-full right-0 mt-2 w-64 bg-bg-card border border-border-strong rounded-xl shadow-2xl p-4 z-30 flex flex-col gap-4">
                  <div>
                    <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-2">Parte 01: Criar nova categoria</p>
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        value={newCategory}
                        onChange={(e) => setNewCategory(e.target.value)}
                        placeholder="Nova categoria..."
                        className="flex-1 bg-bg-main border border-border-subtle rounded-lg px-2 py-1.5 text-xs text-text-primary focus:outline-none focus:border-border-strong"
                      />
                      <button 
                        onClick={() => {
                          if (newCategory.trim()) {
                            onUpdateCategory(newCategory.trim());
                            setNewCategory('');
                            setIsCategoryOpen(false);
                          }
                        }}
                        className="p-1.5 bg-text-primary text-bg-main rounded-lg hover:opacity-90"
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                  </div>
                  
                  {categories.length > 0 && (
                    <div>
                      <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-2">Parte 02: Categorias existentes</p>
                      <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                        {categories.map(cat => (
                          <button
                            key={cat}
                            onClick={() => {
                              onUpdateCategory(cat);
                              setIsCategoryOpen(false);
                            }}
                            className={`px-2 py-1 rounded-md text-xs border transition-colors ${currentCategory === cat ? 'bg-text-primary text-bg-main border-transparent' : 'bg-bg-main border-border-subtle text-text-primary hover:border-text-primary'}`}
                          >
                            {cat}
                          </button>
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
              <Search size={16} />
            </button>
            
            {isSearchOpen && (
                <div className="absolute top-full right-0 mt-2 w-72 bg-bg-card border border-border-strong rounded-xl shadow-2xl p-3 z-30 flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                        <input 
                            type="text" 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && performSearch()}
                            placeholder="Buscar..."
                            className="flex-1 bg-bg-main border border-border-subtle rounded-lg px-3 py-1.5 text-sm text-text-primary focus:outline-none focus:border-border-strong"
                            autoFocus
                        />
                        <button 
                            onClick={performSearch}
                            disabled={isSearching}
                            className="p-1.5 bg-text-primary text-bg-main rounded-lg hover:opacity-90 disabled:opacity-50"
                        >
                            {isSearching ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
                        </button>
                    </div>
                    {searchResults.length > 0 && (
                        <div className="flex items-center justify-between text-xs text-text-muted px-1">
                            <span>{currentResultIndex + 1} de {searchResults.length}</span>
                            <div className="flex gap-1">
                                <button onClick={prevResult} className="p-1 hover:bg-border-subtle rounded"><ChevronLeft size={14}/></button>
                                <button onClick={nextResult} className="p-1 hover:bg-border-subtle rounded"><ChevronRight size={14}/></button>
                            </div>
                        </div>
                    )}
                    {searchQuery && !isSearching && searchResults.length === 0 && (
                        <div className="text-xs text-text-muted text-center py-1">Nenhum resultado</div>
                    )}
                </div>
            )}
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center bg-bg-card border border-border-subtle rounded-xl p-1">
            <button
              onClick={() => setViewMode('single')}
              className={`p-2 rounded-lg transition-colors ${viewMode === 'single' ? 'bg-border-subtle text-text-primary' : 'text-text-muted hover:text-text-primary'}`}
              title="Página Única"
            >
              <FileText size={16} />
            </button>
            <button
              onClick={() => setViewMode('scroll')}
              className={`p-2 rounded-lg transition-colors ${viewMode === 'scroll' ? 'bg-border-subtle text-text-primary' : 'text-text-muted hover:text-text-primary'}`}
              title="Rolagem Contínua"
            >
              <Rows size={16} />
            </button>
          </div>

          {/* Zoom Controls */}
          <div className="flex items-center gap-3 bg-bg-card border border-border-subtle rounded-xl p-2 px-3">
            <button
              onClick={() => setScale(s => Math.max(0.5, s - 0.1))}
              className="text-text-muted hover:text-text-primary transition-colors"
            >
              <Minus size={16} />
            </button>
            
            <input 
              type="range" 
              min="0.5" 
              max="3" 
              step="0.1" 
              value={scale} 
              onChange={(e) => setScale(parseFloat(e.target.value))}
              className="w-24 h-1 bg-border-subtle rounded-lg appearance-none cursor-pointer accent-text-primary"
            />
            
            <button
              onClick={() => setScale(s => Math.min(3, s + 0.1))}
              className="text-text-muted hover:text-text-primary transition-colors"
            >
              <Plus size={16} />
            </button>
            <span className="text-xs font-bold text-text-primary w-10 text-right select-none">
              {Math.round(scale * 100)}%
            </span>
          </div>
        </div>
      </div>

      {/* PDF Content */}
      <div className="flex-1 overflow-auto flex justify-center p-8 bg-bg-main/50 relative">
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
                            renderTextLayer={true}
                            renderAnnotationLayer={true}
                            className="max-w-full"
                        />
                    ) : (
                        Array.from(new Array(numPages), (el, index) => (
                            <Page 
                                key={`page_${index + 1}`}
                                pageNumber={index + 1} 
                                scale={scale} 
                                renderTextLayer={true}
                                renderAnnotationLayer={true}
                                className="max-w-full mb-2 border-b border-gray-200 last:border-0"
                            />
                        ))
                    )}
                </Document>
            </div>
        )}
      </div>
    </div>
  );
}
