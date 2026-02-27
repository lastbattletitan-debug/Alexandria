import { useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Loader2 } from 'lucide-react';

interface PdfViewerProps {
  url: string;
}

export function PdfViewer({ url }: PdfViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [pageNum, setPageNum] = useState(1);
  const [scale, setScale] = useState(1.5);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadPdf = async () => {
      try {
        setLoading(true);
        setError(null);
        const loadingTask = pdfjsLib.getDocument(url);
        const pdf = await loadingTask.promise;
        setPdfDoc(pdf);
        setLoading(false);
      } catch (err) {
        console.error('Error loading PDF:', err);
        setError('Erro ao carregar o PDF.');
        setLoading(false);
      }
    };

    loadPdf();
  }, [url]);

  useEffect(() => {
    const renderPage = async () => {
      if (!pdfDoc || !canvasRef.current) return;

      try {
        const page = await pdfDoc.getPage(pageNum);
        const viewport = page.getViewport({ scale });
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');

        if (!context) return;

        canvas.height = viewport.height;
        canvas.width = viewport.width;

        const renderContext = {
          canvasContext: context,
          viewport: viewport,
        };

        await page.render(renderContext as any).promise;
      } catch (err) {
        console.error('Error rendering page:', err);
      }
    };

    renderPage();
  }, [pdfDoc, pageNum, scale]);

  const changePage = (offset: number) => {
    setPageNum(prev => {
      const newPage = prev + offset;
      if (pdfDoc && (newPage < 1 || newPage > pdfDoc.numPages)) return prev;
      return newPage;
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-white">
        <Loader2 className="animate-spin mr-2" /> Carregando PDF...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full text-red-400">
        {error}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gray-900/50">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-4 bg-black/40 border-b border-white/10 text-white">
        <div className="flex items-center gap-4">
          <button
            onClick={() => changePage(-1)}
            disabled={pageNum <= 1}
            className="p-2 hover:bg-white/10 rounded-lg disabled:opacity-50 transition-colors"
          >
            <ChevronLeft size={20} />
          </button>
          <span className="text-sm font-medium">
            Página {pageNum} de {pdfDoc?.numPages}
          </span>
          <button
            onClick={() => changePage(1)}
            disabled={!pdfDoc || pageNum >= pdfDoc.numPages}
            className="p-2 hover:bg-white/10 rounded-lg disabled:opacity-50 transition-colors"
          >
            <ChevronRight size={20} />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setScale(s => Math.max(0.5, s - 0.25))}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <ZoomOut size={20} />
          </button>
          <span className="text-sm font-medium w-12 text-center">
            {Math.round(scale * 100)}%
          </span>
          <button
            onClick={() => setScale(s => Math.min(3, s + 0.25))}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <ZoomIn size={20} />
          </button>
        </div>
      </div>

      {/* PDF Content */}
      <div className="flex-1 overflow-auto flex justify-center p-8">
        <canvas ref={canvasRef} className="shadow-2xl" />
      </div>
    </div>
  );
}
