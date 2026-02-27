import { useState, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { ChevronLeft, ChevronRight, Loader2, ArrowLeft, Minus, Plus } from 'lucide-react';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Configure worker
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PdfViewerProps {
  url: string;
  title?: string;
  onClose?: () => void;
}

export function PdfViewer({ url, title, onClose }: PdfViewerProps) {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1.0);
  const [inputPage, setInputPage] = useState('1');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setPageNumber(1);
    setInputPage('1');
    setError(null);
    setLoading(true);
  }, [url]);

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

  useEffect(() => {
    setInputPage(pageNumber.toString());
  }, [pageNumber]);

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
    <div className="flex flex-col h-full bg-bg-main">
      {/* Header Bar */}
      <div className="flex items-center justify-between px-6 py-4 bg-bg-sidebar border-b border-border-subtle shrink-0 z-10 shadow-sm">
        {/* Left: Back & Title */}
        <div className="flex items-center gap-4 flex-1">
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 hover:bg-border-subtle rounded-xl text-text-muted hover:text-text-primary transition-colors"
            >
              <ArrowLeft size={20} />
            </button>
          )}
          <h2 className="font-bold text-text-primary text-sm truncate max-w-[200px] lg:max-w-md" title={title}>
            {title || 'Documento PDF'}
          </h2>
        </div>

        {/* Center: Page Navigation */}
        <div className="flex items-center gap-2 flex-1 justify-center">
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

        {/* Right: Zoom Controls */}
        <div className="flex items-center gap-2 flex-1 justify-end">
          <div className="flex items-center bg-bg-card border border-border-subtle rounded-xl p-1">
            <button
              onClick={() => setScale(s => Math.max(0.5, s - 0.1))}
              className="p-2 hover:bg-border-subtle rounded-lg text-text-muted hover:text-text-primary transition-colors"
            >
              <Minus size={16} />
            </button>
            <span className="text-xs font-bold text-text-primary w-12 text-center select-none">
              {Math.round(scale * 100)}%
            </span>
            <button
              onClick={() => setScale(s => Math.min(3, s + 0.1))}
              className="p-2 hover:bg-border-subtle rounded-lg text-text-muted hover:text-text-primary transition-colors"
            >
              <Plus size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* PDF Content */}
      <div className="flex-1 overflow-auto flex justify-center p-8 bg-bg-main/50 relative">
        {loading && !error && (
            <div className="absolute inset-0 flex items-center justify-center z-20">
                <div className="bg-bg-card/80 backdrop-blur-sm p-4 rounded-xl flex items-center gap-3 border border-border-subtle">
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
            <div className="shadow-2xl border border-border-subtle bg-white">
                <Document
                    file={url}
                    onLoadSuccess={onDocumentLoadSuccess}
                    onLoadError={onDocumentLoadError}
                    loading={null}
                    className="flex flex-col items-center"
                >
                    <Page 
                        pageNumber={pageNumber} 
                        scale={scale} 
                        renderTextLayer={false}
                        renderAnnotationLayer={false}
                        className="max-w-full"
                    />
                </Document>
            </div>
        )}
      </div>
    </div>
  );
}
