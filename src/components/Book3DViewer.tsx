import React, { useEffect, useRef, useState, useCallback } from 'react';
import { PageFlip } from 'page-flip';
import { pdfjs } from 'react-pdf';
import { 
  ChevronLeft, 
  ChevronRight, 
  Maximize2, 
  Minimize2, 
  Volume2, 
  VolumeX, 
  BookOpen, 
  Sparkles,
  Compass,
  Feather,
  Bookmark,
  Loader2,
  Plus,
  Minus
} from 'lucide-react';
import { playRealisticPageTurn, initPaperAudio } from '../utils/paperAudio';
import { getMemoryCachedPages, getDbCachedPages, saveCachedPages } from '../utils/pdfCacheStorage';

interface Book3DViewerProps {
  bookId?: string;
  pdfDocument?: any;
  pdfPagesCount?: number;
  pdfUrl?: string;
  isLoading?: boolean;
  onPageChange?: (page: number, total: number) => void;
  onError?: (error: string) => void;
  title?: string;
  initialPage?: number;
  soundEnabled?: boolean;
  paperTheme?: 'vintage' | 'clean' | 'night';
}

export function Book3DViewer({
  bookId,
  pdfDocument,
  pdfPagesCount,
  pdfUrl,
  isLoading = false,
  onPageChange,
  onError,
  title = "Livro Digital",
  initialPage = 0,
  soundEnabled = true,
  paperTheme = 'vintage'
}: Book3DViewerProps) {
  const mountContainerRef = useRef<HTMLDivElement>(null);
  const flipInstanceRef = useRef<any>(null);
  const [currentPage, setCurrentPage] = useState<number>(initialPage);
  const [totalPages, setTotalPages] = useState<number>(8);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [zoomLevel, setZoomLevel] = useState<number>(1.0);
  const [isLoadingPdf, setIsLoadingPdf] = useState<boolean>(false);
  const [loadError, setLoadError] = useState<boolean>(false);
  const [dimensions, setDimensions] = useState({ width: 420, height: 580 });
  const [pageAspectRatio, setPageAspectRatio] = useState<number>(0.714);
  const [pdfPageImages, setPdfPageImages] = useState<string[]>([]);
  const [loadingProgress, setLoadingProgress] = useState<{ current: number; total: number }>({ current: 0, total: 0 });
  const objectUrlsRef = useRef<string[]>([]);

  const isBusyLoading = !loadError && (isLoading || isLoadingPdf || ((!!pdfDocument || !!pdfUrl) && pdfPageImages.length === 0));

  // Simulated progress for non-PDF or initial loading states
  useEffect(() => {
    if (isBusyLoading && loadingProgress.total === 0) {
      setLoadingProgress({ current: 1, total: 8 });
      const interval = setInterval(() => {
        setLoadingProgress(prev => {
          if (prev.current < prev.total) {
            return { ...prev, current: prev.current + 1 };
          }
          return prev;
        });
      }, 100);
      return () => clearInterval(interval);
    }
  }, [isBusyLoading, loadingProgress.total]);

  // Sound ref to avoid re-triggering effects
  const soundEnabledRef = useRef(soundEnabled);
  useEffect(() => {
    soundEnabledRef.current = soundEnabled;
  }, [soundEnabled]);

  // Clean up object URLs on unmount (managed by pdfCacheStorage)
  useEffect(() => {
    return () => {
      // Managed centrally by pdfCacheStorage for persistent instant loading
    };
  }, []);

  // Initialize and unlock paper audio
  useEffect(() => {
    initPaperAudio();
    const unlock = () => {
      initPaperAudio();
    };
    window.addEventListener('pointerdown', unlock, { passive: true, once: true });
    window.addEventListener('touchstart', unlock, { passive: true, once: true });
    window.addEventListener('click', unlock, { passive: true, once: true });
    window.addEventListener('keydown', unlock, { passive: true, once: true });
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('touchstart', unlock);
      window.removeEventListener('click', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, []);

  // Compute responsive page width/height respecting the true page aspect ratio
  const calculateDimensions = useCallback(() => {
    if (!mountContainerRef.current) return;
    const parent = mountContainerRef.current.parentElement || mountContainerRef.current;
    const availableWidth = Math.max(280, (parent.clientWidth || window.innerWidth) - 80);
    const availableHeight = Math.max(280, (parent.clientHeight || window.innerHeight) - 100);
    const isPortrait = false;

    const ratio = Math.max(0.35, Math.min(3.0, pageAspectRatio));

    let testW = availableWidth / 2;
    let testH = testW / ratio;

    if (testH > availableHeight) {
      testH = availableHeight;
      testW = testH * ratio;
    }

    if (testW * 2 > availableWidth) {
      testW = availableWidth / 2;
      testH = testW / ratio;
    }

    setDimensions({
      width: Math.max(140, Math.floor(testW)),
      height: Math.max(180, Math.floor(testH))
    });
  }, [pageAspectRatio]);

  useEffect(() => {
    calculateDimensions();
    window.addEventListener('resize', calculateDimensions);
    return () => window.removeEventListener('resize', calculateDimensions);
  }, [calculateDimensions]);

  // Render PDF pages to high-res image buffers if pdfDocument or pdfUrl exists
  useEffect(() => {
    let active = true;
    setLoadError(false);
    if (!pdfDocument && !pdfUrl) {
      setPdfPageImages([]);
      return;
    }

    const cacheKey = bookId || pdfUrl || title || 'default_pdf_book';

    async function loadPdf() {
      // 1. Instant Memory Cache check (0ms)
      const memCached = getMemoryCachedPages(cacheKey);
      if (memCached && memCached.urls.length > 0) {
        if (active) {
          if (memCached.aspectRatio) setPageAspectRatio(memCached.aspectRatio);
          setPdfPageImages(memCached.urls);
          setIsLoadingPdf(false);
        }
        return;
      }

      // 2. Fast IndexedDB Cache check (~10ms)
      setIsLoadingPdf(true);
      const dbCached = await getDbCachedPages(cacheKey);
      if (!active) return;
      if (dbCached && dbCached.urls.length > 0) {
        if (dbCached.aspectRatio) setPageAspectRatio(dbCached.aspectRatio);
        setPdfPageImages(dbCached.urls);
        setIsLoadingPdf(false);
        return;
      }

      // 3. Fallback to fresh PDF.js canvas rendering
      try {
        let doc = pdfDocument;
        if (!doc && pdfUrl) {
          try {
            const loadingTask = pdfjs.getDocument(pdfUrl);
            doc = await loadingTask.promise;
          } catch (e) {
            console.error('Failed to get PDF document:', e);
            if (active) {
              setLoadError(true);
              setIsLoadingPdf(false);
              onError?.('O arquivo PDF não pôde ser carregado. Por favor, selecione-o novamente.');
            }
            return;
          }
        }
        if (!doc) {
          if (active) {
            setPdfPageImages([]);
            setIsLoadingPdf(false);
            setLoadError(true);
            onError?.('O arquivo PDF não pôde ser carregado. Por favor, selecione-o novamente.');
          }
          return;
        }

        const numPages = doc.numPages || pdfPagesCount || 1;
        const initialBatch = Math.min(numPages, 10);
        setLoadingProgress({ current: 0, total: numPages });

        // Detect true aspect ratio from first page
        const firstPage = await doc.getPage(1);
        const unscaledViewport = firstPage.getViewport({ scale: 1.0 });
        const detectedRatio = unscaledViewport.width / unscaledViewport.height;
        if (detectedRatio && !isNaN(detectedRatio) && detectedRatio > 0) {
          setPageAspectRatio(detectedRatio);
        }

        // Detect mobile screen / touch device to use lower memory footprint & ultra-fast rendering
        const isMobileDevice = typeof window !== 'undefined' && (window.innerWidth < 768 || 'ontouchstart' in window);
        const targetPagePixelWidth = isMobileDevice ? 1200 : 2800; // Fast rendering on mobile, 4K crispness on desktop
        const maxScale = isMobileDevice ? 2.0 : 4.5;
        const renderScale = Math.max(1.2, Math.min(maxScale, targetPagePixelWidth / (unscaledViewport.width || 600)));

        const blobs: Blob[] = new Array(numPages);
        const images: string[] = new Array(numPages);

        async function renderSinglePage(pageNum: number): Promise<{ blob: Blob; url: string } | null> {
          try {
            const page = (pageNum === 1) ? firstPage : await doc.getPage(pageNum);
            const viewport = page.getViewport({ scale: renderScale });
            const canvas = document.createElement('canvas');
            canvas.width = Math.floor(viewport.width);
            canvas.height = Math.floor(viewport.height);
            const ctx = canvas.getContext('2d', { alpha: false });
            if (!ctx) return null;

            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            const renderTask = page.render({ canvasContext: ctx, viewport });
            await renderTask.promise;

            const blob = await new Promise<Blob | null>(resolve => {
              canvas.toBlob(resolve, 'image/jpeg', isMobileDevice ? 0.88 : 0.95);
            });

            if (blob && active) {
              const objectUrl = URL.createObjectURL(blob);
              return { blob, url: objectUrl };
            }
          } catch (err) {
            console.error(`Error rendering page ${pageNum}:`, err);
          }
          return null;
        }

        // Render first 10 pages sequentially for instant book opening
        for (let pNum = 1; pNum <= initialBatch; pNum++) {
          if (!active) return;
          const res = await renderSinglePage(pNum);
          if (res) {
            blobs[pNum - 1] = res.blob;
            images[pNum - 1] = res.url;
          }
          if (active) setLoadingProgress({ current: pNum, total: numPages });
        }

        if (active) {
          const cleanImages = images.filter((img): img is string => Boolean(img));
          if (cleanImages.length === 0) {
            setLoadError(true);
            onError?.('O arquivo PDF não pôde ser carregado. Por favor, selecione-o novamente.');
          } else {
            setPdfPageImages(cleanImages);
          }
          setIsLoadingPdf(false); // Book opens on screen immediately!
        }

        // Render remaining pages in background sequentially
        if (numPages > initialBatch && active) {
          for (let pNum = initialBatch + 1; pNum <= numPages; pNum++) {
            if (!active) return;
            const res = await renderSinglePage(pNum);
            if (res) {
              blobs[pNum - 1] = res.blob;
              images[pNum - 1] = res.url;
            }

            // Batch update UI every 4 pages or at total
            if (active && (pNum % 4 === 0 || pNum === numPages)) {
              const cleanBatch = images.filter((img): img is string => Boolean(img));
              if (cleanBatch.length > 0) {
                setPdfPageImages(cleanBatch);
              }
              setLoadingProgress({ current: pNum, total: numPages });
            }
          }
        }

        // Save rendered blobs into in-memory and IndexedDB cache
        if (active) {
          const validBlobs = blobs.filter((b): b is Blob => Boolean(b));
          if (validBlobs.length > 0) {
            saveCachedPages(cacheKey, validBlobs, detectedRatio || 0.714);
          }
        }
      } catch (err) {
        console.error('PDF rendering to 3D book error:', err);
        if (active) {
          setLoadError(true);
          onError?.('O arquivo PDF não pôde ser carregado. Por favor, selecione-o novamente.');
          setIsLoadingPdf(false);
          setLoadingProgress({ current: 0, total: 0 });
        }
      }
    }

    loadPdf();
    return () => {
      active = false;
    };
  }, [bookId, pdfDocument, pdfUrl, pdfPagesCount, title]);

  // Build and mount PageFlip into isolated container
  useEffect(() => {
    if (isBusyLoading) return;
    const container = mountContainerRef.current;
    if (!container) return;

    // Teardown previous instance
    if (flipInstanceRef.current) {
      try {
        flipInstanceRef.current.destroy();
      } catch (e) {}
      flipInstanceRef.current = null;
    }
    container.innerHTML = '';

    const isPortrait = false;
    const hasPdf = pdfPageImages.length > 0;
    const total = hasPdf ? pdfPageImages.length : 8;
    setTotalPages(total);

    // Create wrapper div for PageFlip
    const bookEl = document.createElement('div');
    bookEl.className = 'st-flip-book-wrapper';
    container.appendChild(bookEl);

    // Generate DOM elements for pages
    if (hasPdf) {
      pdfPageImages.forEach((imgUrl, idx) => {
        const page = document.createElement('div');
        const pageBg = paperTheme === 'night' ? '#181d28' : paperTheme === 'vintage' ? '#fcf7ed' : '#ffffff';
        page.className = 'book-leaf-page';
        page.style.width = `${dimensions.width}px`;
        page.style.height = `${dimensions.height}px`;
        page.style.backgroundColor = pageBg;
        page.style.overflow = 'hidden';
        page.style.position = 'relative';
        page.style.boxSizing = 'border-box';
        page.style.opacity = '1';

        const img = document.createElement('img');
        img.src = imgUrl;
        img.style.width = '100%';
        img.style.height = '100%';
        img.style.objectFit = 'contain';
        img.style.backgroundColor = pageBg;
        img.style.display = 'block';
        img.style.userSelect = 'none';
        img.style.pointerEvents = 'none';
        page.appendChild(img);

        // Spine shadow gradient
        const shadow = document.createElement('div');
        shadow.style.position = 'absolute';
        shadow.style.top = '0';
        shadow.style.bottom = '0';
        shadow.style.width = '30px';
        shadow.style.pointerEvents = 'none';
        shadow.style.opacity = '0.55';
        if (idx === 0) {
          // Front cover - spine on left
          shadow.style.left = '0';
          shadow.style.background = 'linear-gradient(to right, rgba(0,0,0,0.25), transparent)';
        } else if (idx % 2 === 1) {
          // Left page in open spread - inner spine on right
          shadow.style.right = '0';
          shadow.style.background = 'linear-gradient(to left, rgba(0,0,0,0.2), transparent)';
        } else {
          // Right page in open spread - inner spine on left
          shadow.style.left = '0';
          shadow.style.background = 'linear-gradient(to right, rgba(0,0,0,0.2), transparent)';
        }
        page.appendChild(shadow);

        bookEl.appendChild(page);
      });
    } else {
      // 8 High-Fidelity Prototype Pages
      const pagesData = [
        // Page 1: Cover
        `
        <div class="book-leaf-page" data-density="hard" style="width:${dimensions.width}px; height:${dimensions.height}px; background: linear-gradient(145deg, #3d1b0d, #1f0b04); color: #fdf3d7; padding: 24px; display: flex; flex-direction: column; justify-content: space-between; border: 3px solid #6b351d; box-shadow: inset 0 0 50px rgba(0,0,0,0.85); box-sizing: border-box; text-align: center; position: relative;">
          <div style="border: 1px solid rgba(245,158,11,0.35); padding: 12px; height: 100%; display: flex; flex-direction: column; justify-content: space-between; box-sizing: border-box;">
            <div>
              <p style="font-size: 10px; text-transform: uppercase; letter-spacing: 3px; color: #fbbf24; font-weight: bold; margin-bottom: 8px;">Alexandria Codex</p>
              <div style="width: 32px; height: 1px; background: #fbbf24; margin: 0 auto 16px auto;"></div>
              <h1 style="font-family: serif; font-size: 24px; font-weight: 900; line-height: 1.2; text-transform: uppercase; color: #fffbeb;">O Livro do<br/>Conhecimento</h1>
              <p style="font-family: serif; font-style: italic; font-size: 11px; color: #fde68a; margin-top: 8px; opacity: 0.85;">Experiência de Leitura 3D</p>
            </div>
            <div style="margin: 0 auto; width: 72px; height: 72px; border-radius: 50%; border: 2px solid rgba(245,158,11,0.4); display: flex; align-items: center; justify-content: center; background: rgba(0,0,0,0.3);">
              <span style="font-size: 32px; color: #fbbf24;">✦</span>
            </div>
            <div>
              <p style="font-size: 11px; font-weight: bold; color: #fbbf24; letter-spacing: 2px;">VOLUME I</p>
              <p style="font-size: 9px; color: rgba(251,191,36,0.6); margin-top: 4px;">Puxe a ponta da folha para folhear →</p>
            </div>
          </div>
        </div>
        `,
        // Page 2: Preface
        `
        <div class="book-leaf-page" style="width:${dimensions.width}px; height:${dimensions.height}px; background: ${paperTheme === 'vintage' ? '#fcf7ed' : paperTheme === 'night' ? '#181d28' : '#ffffff'}; color: ${paperTheme === 'night' ? '#cbd5e1' : '#1a1612'}; padding: 28px; display: flex; flex-direction: column; justify-content: space-between; box-sizing: border-box; font-family: serif; position: relative;">
          <div style="position: absolute; top: 0; bottom: 0; right: 0; width: 24px; background: linear-gradient(to left, rgba(0,0,0,0.12), transparent); pointer-events: none;"></div>
          <div>
            <p style="font-size: 10px; text-transform: uppercase; letter-spacing: 2px; color: #b45309; font-weight: bold; text-align: center;">Introdução</p>
            <h2 style="font-size: 18px; font-weight: bold; text-align: center; margin: 4px 0 12px 0; color: ${paperTheme === 'night' ? '#fff' : '#1c120c'};">A Arte de Folhear</h2>
            <div style="width: 28px; height: 1.5px; background: #b45309; margin: 0 auto 16px auto; opacity: 0.7;"></div>
            <p style="font-size: 12px; line-height: 1.65; text-align: justify; margin-bottom: 12px; color: ${paperTheme === 'night' ? '#e2e8f0' : '#1a1612'};">
              <span style="float: left; font-size: 36px; line-height: 0.85; padding-right: 8px; color: #b45309; font-weight: bold; font-family: serif;">H</span>á uma magia silenciosa no gesto de virar uma página. Não é apenas a passagem de dados ou caracteres; é uma jornada física, onde o tempo desacelera e cada folha revela um novo horizonte.
            </p>
            <p style="font-size: 12px; line-height: 1.65; text-align: justify; color: ${paperTheme === 'night' ? '#e2e8f0' : '#1a1612'};">
              Este leitor tridimensional foi projetado para resgatar a elegância física das grandes enciclopédias e manuscritos clássicos, unindo a física 3D à pureza da leitura atenta.
            </p>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 9.5px; color: #78350f; font-weight: 600; border-top: 1px solid rgba(180,83,9,0.3); padding-top: 8px;">
            <span>Alexandria Codex</span>
            <span>i</span>
          </div>
        </div>
        `,
        // Page 3: Table of Contents
        `
        <div class="book-leaf-page" style="width:${dimensions.width}px; height:${dimensions.height}px; background: ${paperTheme === 'vintage' ? '#fcf7ed' : paperTheme === 'night' ? '#181d28' : '#ffffff'}; color: ${paperTheme === 'night' ? '#cbd5e1' : '#1a1612'}; padding: 28px; display: flex; flex-direction: column; justify-content: space-between; box-sizing: border-box; font-family: serif; position: relative;">
          <div style="position: absolute; top: 0; bottom: 0; left: 0; width: 24px; background: linear-gradient(to right, rgba(0,0,0,0.12), transparent); pointer-events: none;"></div>
          <div>
            <h2 style="font-size: 16px; font-weight: bold; margin-bottom: 14px; color: ${paperTheme === 'night' ? '#fff' : '#1c120c'};">Sumário Geral</h2>
            <div style="font-size: 11.5px; line-height: 2.2;">
              <div style="display:flex; justify-content:space-between; border-bottom:1px dashed rgba(180,83,9,0.35); font-weight: 500;">
                <span>Capítulo 1: A Geometria da Mente</span>
                <span style="font-family: monospace; color: #b45309; font-weight: bold;">03</span>
              </div>
              <div style="display:flex; justify-content:space-between; border-bottom:1px dashed rgba(180,83,9,0.35); font-weight: 500;">
                <span>Capítulo 2: Cartografia dos Saberes</span>
                <span style="font-family: monospace; color: #b45309; font-weight: bold;">04</span>
              </div>
              <div style="display:flex; justify-content:space-between; border-bottom:1px dashed rgba(180,83,9,0.35); font-weight: 500;">
                <span>Capítulo 3: O Cosmos e a Linguagem</span>
                <span style="font-family: monospace; color: #b45309; font-weight: bold;">05</span>
              </div>
              <div style="display:flex; justify-content:space-between; border-bottom:1px dashed rgba(180,83,9,0.35); font-weight: 500;">
                <span>Epílogo: A Biblioteca Infinita</span>
                <span style="font-family: monospace; color: #b45309; font-weight: bold;">06</span>
              </div>
            </div>
            <div style="margin-top: 18px; padding: 10px; background: rgba(245,158,11,0.12); border-left: 3px solid #b45309; border-radius: 4px; font-size: 10.5px; line-height: 1.4; color: #1a1612;">
              <b>Controles:</b> Arraste com o mouse/dedo ou use as setas ← e → do teclado.
            </div>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 9.5px; color: #78350f; font-weight: 600; border-top: 1px solid rgba(180,83,9,0.3); padding-top: 8px;">
            <span>Sumário</span>
            <span>ii</span>
          </div>
        </div>
        `,
        // Page 4: Chapter 1
        `
        <div class="book-leaf-page" style="width:${dimensions.width}px; height:${dimensions.height}px; background: ${paperTheme === 'vintage' ? '#fcf7ed' : paperTheme === 'night' ? '#181d28' : '#ffffff'}; color: ${paperTheme === 'night' ? '#cbd5e1' : '#1a1612'}; padding: 28px; display: flex; flex-direction: column; justify-content: space-between; box-sizing: border-box; font-family: serif; position: relative;">
          <div style="position: absolute; top: 0; bottom: 0; right: 0; width: 24px; background: linear-gradient(to left, rgba(0,0,0,0.12), transparent); pointer-events: none;"></div>
          <div>
            <p style="font-size: 9.5px; text-transform: uppercase; letter-spacing: 2px; color: #b45309; font-weight: bold;">Capítulo I</p>
            <h3 style="font-size: 17px; font-weight: bold; margin: 4px 0 10px 0; color: ${paperTheme === 'night' ? '#fff' : '#1c120c'};">A Geometria da Mente</h3>
            <p style="font-size: 11.5px; line-height: 1.6; text-align: justify; margin-bottom: 10px; color: ${paperTheme === 'night' ? '#e2e8f0' : '#1a1612'};">
              Todo pensamento constrói uma arquitetura invisível. Quando os matemáticos traçavam círculos na areia de Alexandria, estavam mapeando as leis do cosmos.
            </p>
            <div style="margin: 10px 0; padding: 12px; background: #111827; border-radius: 8px; text-align: center; color: #fde68a;">
              <svg width="100" height="60" viewBox="0 0 100 60" style="margin: 0 auto; stroke: #f59e0b; fill: none;">
                <circle cx="50" cy="30" r="22" stroke-width="1" stroke-dasharray="2 2" />
                <polygon points="50,10 72,48 28,48" stroke-width="1.5" />
                <circle cx="50" cy="30" r="2" style="fill: #f59e0b;" />
              </svg>
              <p style="font-family: monospace; font-size: 8.5px; opacity: 0.9; margin-top: 4px; color: #fde68a;">Figura 1.1: Razão Áurea & Harmonia</p>
            </div>
            <p style="font-size: 11.5px; line-height: 1.6; text-align: justify; color: ${paperTheme === 'night' ? '#e2e8f0' : '#1a1612'};">
              A proporção observada na concha do Nautilus replica-se na curvatura suave das folhas que agora você manuseia.
            </p>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 9.5px; color: #78350f; font-weight: 600; border-top: 1px solid rgba(180,83,9,0.3); padding-top: 8px;">
            <span>Geometria</span>
            <span>3</span>
          </div>
        </div>
        `,
        // Page 5: Chapter 2
        `
        <div class="book-leaf-page" style="width:${dimensions.width}px; height:${dimensions.height}px; background: ${paperTheme === 'vintage' ? '#fcf7ed' : paperTheme === 'night' ? '#181d28' : '#ffffff'}; color: ${paperTheme === 'night' ? '#cbd5e1' : '#1a1612'}; padding: 28px; display: flex; flex-direction: column; justify-content: space-between; box-sizing: border-box; font-family: serif; position: relative;">
          <div style="position: absolute; top: 0; bottom: 0; left: 0; width: 24px; background: linear-gradient(to right, rgba(0,0,0,0.12), transparent); pointer-events: none;"></div>
          <div>
            <p style="font-size: 9.5px; text-transform: uppercase; letter-spacing: 2px; color: #b45309; font-weight: bold;">Capítulo II</p>
            <h3 style="font-size: 17px; font-weight: bold; margin: 4px 0 10px 0; color: ${paperTheme === 'night' ? '#fff' : '#1c120c'};">Cartografia dos Saberes</h3>
            <p style="font-size: 11.5px; line-height: 1.6; text-align: justify; margin-bottom: 10px; color: ${paperTheme === 'night' ? '#e2e8f0' : '#1a1612'};">
              Os mapas demarcam os limites da curiosidade. No Grande Farol, astrônomos perscrutavam constelações cuja luz guiava frotas de mercadores e filósofos.
            </p>
            <div style="background: rgba(245,158,11,0.1); padding: 10px; border-radius: 6px; border: 1px solid rgba(180,83,9,0.3); margin: 8px 0; font-size: 11px;">
              <b style="color: #92400e;">Cálculo de Eratóstenes</b>
              <p style="margin-top: 2px; color: #1a1612; line-height: 1.5;">Mediu a circunferência da Terra há mais de 2.200 anos com precisão espantosa usando sombras solares.</p>
            </div>
            <p style="font-size: 11.5px; line-height: 1.6; text-align: justify; color: ${paperTheme === 'night' ? '#e2e8f0' : '#1a1612'};">
              Cada professor em sua plataforma preserva este legado ao responder e contextualizar conhecimentos em diálogos vivos.
            </p>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 9.5px; color: #78350f; font-weight: 600; border-top: 1px solid rgba(180,83,9,0.3); padding-top: 8px;">
            <span>Cartografia</span>
            <span>4</span>
          </div>
        </div>
        `,
        // Page 6: Chapter 3
        `
        <div class="book-leaf-page" style="width:${dimensions.width}px; height:${dimensions.height}px; background: ${paperTheme === 'vintage' ? '#fcf7ed' : paperTheme === 'night' ? '#181d28' : '#ffffff'}; color: ${paperTheme === 'night' ? '#cbd5e1' : '#1a1612'}; padding: 28px; display: flex; flex-direction: column; justify-content: space-between; box-sizing: border-box; font-family: serif; position: relative;">
          <div style="position: absolute; top: 0; bottom: 0; right: 0; width: 24px; background: linear-gradient(to left, rgba(0,0,0,0.12), transparent); pointer-events: none;"></div>
          <div>
            <p style="font-size: 9.5px; text-transform: uppercase; letter-spacing: 2px; color: #b45309; font-weight: bold;">Capítulo III</p>
            <h3 style="font-size: 17px; font-weight: bold; margin: 4px 0 10px 0; color: ${paperTheme === 'night' ? '#fff' : '#1c120c'};">O Cosmos e a Linguagem</h3>
            <p style="font-size: 11.5px; line-height: 1.6; text-align: justify; margin-bottom: 8px; color: ${paperTheme === 'night' ? '#e2e8f0' : '#1a1612'};">
              As palavras são os vetores do espírito. Ao transformarmos textos em embeddings, calculamos a afinidade entre ideias:
            </p>
            <div style="background: #111827; padding: 10px; border-radius: 6px; font-family: monospace; font-size: 9.5px; color: #86efac; margin: 8px 0;">
              <span style="color:#9ca3af;">// Similaridade Vetorial</span><br/>
              cos(θ) = (A · B) / (||A|| * ||B||);<br/>
              <span style="color:#fde68a;">score &gt; 0.50 → Relevante</span>
            </div>
            <p style="font-size: 11.5px; line-height: 1.6; text-align: justify; color: ${paperTheme === 'night' ? '#e2e8f0' : '#1a1612'};">
              O motor de busca em vetor recupera trechos precisos para formular respostas fundamentadas em seus documentos.
            </p>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 9.5px; color: #78350f; font-weight: 600; border-top: 1px solid rgba(180,83,9,0.3); padding-top: 8px;">
            <span>Linguagem</span>
            <span>5</span>
          </div>
        </div>
        `,
        // Page 7: Epilogue
        `
        <div class="book-leaf-page" style="width:${dimensions.width}px; height:${dimensions.height}px; background: ${paperTheme === 'vintage' ? '#fcf7ed' : paperTheme === 'night' ? '#181d28' : '#ffffff'}; color: ${paperTheme === 'night' ? '#cbd5e1' : '#1a1612'}; padding: 28px; display: flex; flex-direction: column; justify-content: space-between; box-sizing: border-box; font-family: serif; position: relative;">
          <div style="position: absolute; top: 0; bottom: 0; left: 0; width: 24px; background: linear-gradient(to right, rgba(0,0,0,0.12), transparent); pointer-events: none;"></div>
          <div style="text-align: center; margin-top: 10px;">
            <span style="font-size: 24px; color: #b45309;">✧</span>
            <h3 style="font-size: 17px; font-weight: bold; margin: 8px 0 12px 0; color: ${paperTheme === 'night' ? '#fff' : '#1c120c'};">A Biblioteca Infinita</h3>
            <p style="font-size: 12px; line-height: 1.65; text-align: justify; margin-bottom: 12px; color: ${paperTheme === 'night' ? '#e2e8f0' : '#1a1612'};">
              Jorge Luis Borges concebeu o universo como uma biblioteca infinita de galerias hexagonais.
            </p>
            <p style="font-size: 12px; line-height: 1.65; text-align: justify; color: ${paperTheme === 'night' ? '#e2e8f0' : '#1a1612'};">
              Aqui, cada livro abre portais para o estudo concentrado, anotações instantâneas e a sensação tátil da leitura.
            </p>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 9.5px; color: #78350f; font-weight: 600; border-top: 1px solid rgba(180,83,9,0.3); padding-top: 8px;">
            <span>Epílogo</span>
            <span>6</span>
          </div>
        </div>
        `,
        // Page 8: Back Cover
        `
        <div class="book-leaf-page" data-density="hard" style="width:${dimensions.width}px; height:${dimensions.height}px; background: linear-gradient(145deg, #3d1b0d, #1f0b04); color: #fdf3d7; padding: 24px; display: flex; flex-direction: column; justify-content: space-between; border: 3px solid #6b351d; box-shadow: inset 0 0 50px rgba(0,0,0,0.85); box-sizing: border-box; text-align: center;">
          <div style="border: 1px solid rgba(245,158,11,0.35); padding: 16px; height: 100%; display: flex; flex-direction: column; justify-content: center; box-sizing: border-box;">
            <span style="font-size: 28px; color: #fbbf24; margin-bottom: 12px;">✦</span>
            <p style="font-family: serif; font-style: italic; font-size: 12px; line-height: 1.6; color: #fde68a;">
              "A leitura de todos os bons livros é uma conversação com as mais distintas pessoas dos séculos passados."
            </p>
            <p style="font-size: 10px; text-transform: uppercase; letter-spacing: 2px; color: #fbbf24; font-weight: bold; margin-top: 12px;">
              — René Descartes
            </p>
          </div>
        </div>
        `
      ];

      pagesData.forEach((html) => {
        const temp = document.createElement('div');
        temp.innerHTML = html.trim();
        if (temp.firstElementChild) {
          bookEl.appendChild(temp.firstElementChild);
        }
      });
    }

    try {
      const flip = new PageFlip(bookEl, {
        width: dimensions.width,
        height: dimensions.height,
        size: 'fixed',
        minWidth: Math.min(80, dimensions.width),
        maxWidth: Math.max(1600, dimensions.width),
        minHeight: Math.min(100, dimensions.height),
        maxHeight: Math.max(1800, dimensions.height),
        maxShadowOpacity: 0.22,
        showCover: false,
        showPageCorners: false,
        mobileScrollSupport: false,
        usePortrait: false,
        startPage: Math.min(initialPage, total - 1),
        drawShadow: true,
        flippingTime: 650,
        useMouseEvents: true,
        swipeDistance: 25,
        clickEventForward: true,
      });

      const leaves = bookEl.querySelectorAll('.book-leaf-page');
      flip.loadFromHTML(leaves);

      // Center spine seam and 3D relief groove
      const spineEl = document.createElement('div');
      spineEl.className = 'st-center-spine-groove';
      spineEl.style.position = 'absolute';
      spineEl.style.top = '0';
      spineEl.style.bottom = '0';
      spineEl.style.left = '50%';
      spineEl.style.width = '44px';
      spineEl.style.transform = 'translateX(-50%)';
      spineEl.style.pointerEvents = 'none';
      // In front of resting pages (z-index 1), but strictly behind turning pages (z-index 5/50) and bottom page (z-index 3)
      spineEl.style.zIndex = '2';
      spineEl.style.display = 'block';

      spineEl.innerHTML = `
        <div style="position: absolute; inset: 0; background: linear-gradient(to right, transparent 0%, rgba(0,0,0,0.05) 15%, rgba(0,0,0,0.20) 38%, rgba(0,0,0,0.48) 49%, rgba(0,0,0,0.58) 50%, rgba(0,0,0,0.48) 51%, rgba(0,0,0,0.20) 62%, rgba(0,0,0,0.05) 85%, transparent 100%);"></div>
        <div style="position: absolute; top: 0; bottom: 0; left: 50%; width: 2px; transform: translateX(-50%); background: rgba(0,0,0,0.75); box-shadow: 0 0 3px rgba(0,0,0,0.8), 1px 0 1.5px rgba(255,255,255,0.25);"></div>
        <div style="position: absolute; inset: 0; background: linear-gradient(to bottom, rgba(0,0,0,0.22) 0%, transparent 20px, transparent calc(100% - 20px), rgba(0,0,0,0.22) 100%);"></div>
      `;

      const blockEl = bookEl.querySelector('.stf__block') || bookEl.querySelector('.stf__wrapper') || bookEl;
      blockEl.appendChild(spineEl);

      // Ensure flipping page and its shadows are layered strictly in front of the center spine shadow
      const renderObj = (flip as any).getRender ? (flip as any).getRender() : (flip as any).render;
      if (renderObj && renderObj.drawFrame) {
        const origDrawFrame = renderObj.drawFrame.bind(renderObj);
        renderObj.drawFrame = function() {
          origDrawFrame();
          if (this.flippingPage) {
            const pageEl = this.flippingPage.getElement?.();
            if (pageEl) {
              pageEl.style.zIndex = '50';
            }
          }
          if (this.outerShadow) {
            this.outerShadow.style.zIndex = '51';
          }
          if (this.innerShadow) {
            this.innerShadow.style.zIndex = '51';
          }
        };
      }

      // Configure flipController
      const controller = (flip as any).getFlipController ? (flip as any).getFlipController() : (flip as any).flipController;
      if (controller) {
        // Disable corner hover preview: only fold/pull when user clicks and holds/drags
        controller.showCorner = function() {
          // No-op on mouse hover: wait for click and drag
        };

        // Fix PageFlip bug where flipPrev calculates hardcoded x:10 without accounting for bounding rect left offset
        controller.flipPrev = function(corner = 'top') {
          const rect = this.render.getRect();
          this.flip({
            x: rect.left + 10,
            y: corner === 'top' ? rect.top + 10 : rect.top + rect.height - 10
          });
        };
        controller.flipNext = function(corner = 'top') {
          const rect = this.render.getRect();
          const totalWidth = rect.pageWidth ? rect.pageWidth * 2 : (dimensions.width * 2);
          this.flip({
            x: rect.left + totalWidth - 10,
            y: corner === 'top' ? rect.top + 10 : rect.top + rect.height - 10
          });
        };
      }

      flip.on('changeState', (e: any) => {
        // Only trigger audio on manual cursor fold (user_fold) to avoid double/delayed sound on button clicks
        if (e.data === 'user_fold' && soundEnabledRef.current) {
          playRealisticPageTurn(0.85);
        }
      });

      flip.on('flip', (e: any) => {
        setCurrentPage(e.data);
        if (onPageChange) {
          onPageChange(e.data + 1, total);
        }
        // Update spine groove visibility: visible only on two-page open spreads
        if (spineEl) {
          spineEl.style.display = 'block';
        }
      });

      flipInstanceRef.current = flip;
    } catch (err) {
      console.error('PageFlip initialization error:', err);
    }

    return () => {
      if (flipInstanceRef.current) {
        try {
          flipInstanceRef.current.destroy();
        } catch (e) {}
        flipInstanceRef.current = null;
      }
      if (mountContainerRef.current) {
        mountContainerRef.current.innerHTML = '';
      }
    };
  }, [dimensions, pdfPageImages, paperTheme, initialPage, onPageChange, isBusyLoading]);

  const handlePrevPage = useCallback(() => {
    if (soundEnabledRef.current) playRealisticPageTurn(0.85);
    if (!flipInstanceRef.current) return;
    try {
      flipInstanceRef.current.flipPrev('top');
    } catch (e) {
      flipInstanceRef.current.turnToPrevPage?.();
    }
  }, []);

  const handleNextPage = useCallback(() => {
    if (soundEnabledRef.current) playRealisticPageTurn(0.85);
    if (!flipInstanceRef.current) return;
    try {
      flipInstanceRef.current.flipNext('top');
    } catch (e) {
      flipInstanceRef.current.turnToNextPage?.();
    }
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (
        document.activeElement?.tagName === 'INPUT' || 
        document.activeElement?.tagName === 'TEXTAREA'
      ) return;

      if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') {
        e.preventDefault();
        handleNextPage();
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        handlePrevPage();
      } else if (e.key === 'f' || e.key === 'F') {
        toggleFullscreen();
      } else if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        setZoomLevel(z => Math.min(2.5, z + 0.2));
      } else if (e.key === '-') {
        e.preventDefault();
        setZoomLevel(z => Math.max(0.7, z - 0.2));
      } else if (e.key === '0') {
        e.preventDefault();
        setZoomLevel(1.0);
      }
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleNextPage, handlePrevPage]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      mountContainerRef.current?.parentElement?.requestFullscreen?.().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const getBackgroundTheme = () => {
    if (paperTheme === 'night') {
      return 'bg-[#08090C] text-slate-100';
    }
    if (paperTheme === 'clean') {
      return 'bg-[#0A0A0A] text-gray-100';
    }
    return 'bg-[#0D0D0E] text-stone-100';
  };

  return (
    <div className={`w-full h-full flex flex-col justify-between items-center relative overflow-hidden select-none transition-colors duration-500 bg-bg-main ${getBackgroundTheme()}`}>
      {/* Background ambient subtle lighting */}
      <div className="absolute inset-0 pointer-events-none opacity-30 bg-[radial-gradient(ellipse_at_center,_rgba(255,255,255,0.04)_0%,_transparent_70%)]" />

      {/* Main Stage: Centered Loading Symbol, Error, or 3D Book */}
      {loadError ? (
        <div className="flex-1 w-full flex flex-col items-center justify-center p-6 gap-4 z-30 animate-in fade-in duration-300 select-none text-center max-w-sm my-auto">
          <div className="w-14 h-14 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center text-2xl font-bold shadow-lg">!</div>
          <div className="flex flex-col gap-1.5">
            <span className="text-base font-bold text-text-primary">
              Arquivo PDF não encontrado ou expirado
            </span>
            <span className="text-xs text-text-muted leading-relaxed">
              Sessões do navegador expiram links temporários. Selecione o PDF original para salvá-lo no dispositivo.
            </span>
          </div>
        </div>
      ) : isBusyLoading ? (
        <div className="flex-1 w-full flex flex-col items-center justify-center p-6 gap-4 z-30 animate-in fade-in duration-300 select-none">
          <div className="bg-bg-card/90 backdrop-blur-xl p-6 md:p-8 rounded-2xl flex flex-col items-center gap-4 border border-border-subtle shadow-2xl max-w-xs text-center">
            <div className="relative flex items-center justify-center">
              <div className="w-12 h-12 rounded-full border-2 border-border-subtle border-t-text-primary animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <BookOpen size={18} className="text-text-muted" />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-semibold text-text-primary tracking-wide">
                Carregando Livro 3D
              </span>
              <span className="text-xs text-text-muted">
                {loadingProgress.total > 0
                  ? `Renderizando página ${loadingProgress.current} de ${loadingProgress.total}...`
                  : 'Preparando páginas em alta resolução...'}
              </span>
            </div>
            {loadingProgress.total > 0 && (
              <div className="w-full bg-border-subtle h-1 rounded-full overflow-hidden mt-1">
                <div 
                  className="bg-text-primary h-full transition-all duration-150 rounded-full"
                  style={{ width: `${Math.round((loadingProgress.current / loadingProgress.total) * 100)}%` }}
                />
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex-1 w-full h-full flex items-center justify-center relative p-0.5 overflow-auto">
          {/* Left Arrow Button */}
          <button
            onClick={handlePrevPage}
            disabled={currentPage <= 0}
            className="absolute left-2 md:left-4 z-30 p-3 rounded-full backdrop-blur-xl bg-black/60 border border-white/20 text-white hover:bg-black/90 hover:scale-105 disabled:opacity-0 disabled:pointer-events-none transition-all shadow-2xl"
            title="Página anterior"
          >
            <ChevronLeft size={20} />
          </button>

          {/* Right Arrow Button */}
          <button
            onClick={handleNextPage}
            disabled={currentPage >= totalPages - 1}
            className="absolute right-2 md:left-auto md:right-4 z-30 p-3 rounded-full backdrop-blur-xl bg-black/60 border border-white/20 text-white hover:bg-black/90 hover:scale-105 disabled:opacity-0 disabled:pointer-events-none transition-all shadow-2xl"
            title="Próxima página"
          >
            <ChevronRight size={20} />
          </button>

          {/* Book Desk Surface & Cover Frame */}
          <div 
            className="relative flex items-center justify-center p-0.5 rounded-2xl bg-[#121214] shadow-[0_25px_80px_rgba(0,0,0,0.95)] border border-white/10 overflow-hidden max-w-full max-h-full transition-transform duration-200 ease-out origin-center"
            style={{
              transform: `scale(${zoomLevel})`,
              transformOrigin: 'center center'
            }}
            onDoubleClick={() => setZoomLevel(z => z === 1.0 ? 1.4 : 1.0)}
            title="Clique duplo para alternar zoom (100% / 140%)"
          >
            {/* Spine Groove Shadow (Behind the pages: z-0) */}
            <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-6 z-0 pointer-events-none flex items-center justify-center opacity-70">
              <div className="w-[3px] h-full bg-gradient-to-b from-transparent via-[#000000] to-transparent shadow-[0_0_10px_rgba(0,0,0,0.95)]" />
            </div>

            {/* Ribbon Bookmark visual (Behind the pages: z-0) */}
            <div className="absolute -top-2 left-[48%] z-0 pointer-events-none drop-shadow-[0_4px_6px_rgba(0,0,0,0.7)]">
              <div className="w-3.5 h-10 bg-gradient-to-b from-red-800 to-red-950 rounded-b-sm border-x border-red-950 flex items-end justify-center pb-1">
                <Bookmark size={9} className="text-amber-200 fill-amber-200 opacity-90" />
              </div>
            </div>

            {/* Mount Container for PageFlip DOM instances */}
            <div ref={mountContainerRef} className="relative z-10 cursor-grab active:cursor-grabbing" />
          </div>
        </div>
      )}

      {/* Floating Bottom Page & Zoom Controls */}
      {!isBusyLoading && (
        <div className="absolute bottom-3 md:bottom-5 left-1/2 -translate-x-1/2 z-30 pointer-events-auto">
          <div className="flex items-center gap-1.5 md:gap-2 bg-black/80 backdrop-blur-xl border border-white/15 px-3 md:px-4 py-1.5 rounded-full shadow-2xl">
            {/* Prev Page */}
            <button
              onClick={handlePrevPage}
              disabled={currentPage <= 0}
              className="p-1 hover:text-white text-white/50 disabled:opacity-20 transition-colors"
              title="Página anterior"
            >
              <ChevronLeft size={14} />
            </button>
            
            {/* Page Count */}
            <span className="text-xs font-bold text-white tracking-wider select-none px-1">
              {currentPage + 1} <span className="text-white/40 font-normal">/</span> {totalPages}
            </span>

            {/* Next Page */}
            <button
              onClick={handleNextPage}
              disabled={currentPage >= totalPages - 1}
              className="p-1 hover:text-white text-white/50 disabled:opacity-20 transition-colors"
              title="Próxima página"
            >
              <ChevronRight size={14} />
            </button>

            <div className="w-[1px] h-3.5 bg-white/20 my-auto mx-0.5" />

            {/* Zoom Out */}
            <button
              onClick={() => setZoomLevel((z) => Math.max(0.7, Number((z - 0.2).toFixed(2))))}
              disabled={zoomLevel <= 0.75}
              className="p-1 hover:text-white text-white/50 disabled:opacity-20 transition-colors"
              title="Reduzir Zoom (-)"
            >
              <Minus size={14} />
            </button>

            {/* Zoom Percentage Indicator / Reset */}
            <button
              onClick={() => setZoomLevel(1.0)}
              className="text-[11px] font-semibold text-white/80 hover:text-white px-1 select-none transition-colors"
              title="Redefinir Zoom (100%)"
            >
              {Math.round(zoomLevel * 100)}%
            </button>

            {/* Zoom In */}
            <button
              onClick={() => setZoomLevel((z) => Math.min(2.5, Number((z + 0.2).toFixed(2))))}
              disabled={zoomLevel >= 2.4}
              className="p-1 hover:text-white text-white/50 disabled:opacity-20 transition-colors"
              title="Aumentar Zoom (+)"
            >
              <Plus size={14} />
            </button>

            <div className="w-[1px] h-3.5 bg-white/20 my-auto mx-0.5" />

            {/* Fullscreen Toggle */}
            <button
              onClick={toggleFullscreen}
              className="p-1 hover:text-white text-white/50 transition-colors"
              title={isFullscreen ? 'Sair da tela cheia' : 'Tela cheia'}
            >
              {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
