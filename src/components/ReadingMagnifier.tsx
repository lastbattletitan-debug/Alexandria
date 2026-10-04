import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, ZoomIn, ZoomOut, Maximize2, Minimize2, X, Sliders } from 'lucide-react';

export function ReadingMagnifier() {
  const [isActive, setIsActive] = useState<boolean>(false);
  const [zoomLevel, setZoomLevel] = useState<number>(2.0);
  const [lensSize, setLensSize] = useState<number>(220);
  const [mousePos, setMousePos] = useState<{ x: number; y: number }>({ x: -500, y: -500 });
  const [isContextMenuOpen, setIsContextMenuOpen] = useState<boolean>(false);
  const [menuPos, setMenuPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [hasCanvasUnderCursor, setHasCanvasUnderCursor] = useState<boolean>(false);

  const ctrlPressesRef = useRef<number[]>([]);
  const lensCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const mirrorContainerRef = useRef<HTMLDivElement | null>(null);
  const lastTargetNodeRef = useRef<HTMLElement | null>(null);
  const mousePosRef = useRef<{ x: number; y: number }>({ x: -500, y: -500 });
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  }, []);

  // Keyboard shortcut listener: Triple press Ctrl
  useEffect(() => {
    // Only enable on Desktop / non-touch large screens
    const isMobile = typeof window !== 'undefined' && (window.innerWidth < 768 || 'ontouchstart' in window);
    if (isMobile) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Control') {
        const now = Date.now();
        // Keep presses in the last 700ms
        const recent = ctrlPressesRef.current.filter((t) => now - t < 700);
        recent.push(now);
        ctrlPressesRef.current = recent;

        if (recent.length >= 3) {
          ctrlPressesRef.current = [];
          setIsActive((prev) => {
            const next = !prev;
            if (next) {
              showToast('🔍 Lupa de leitura ativada (Ctrl 3x para desativar ou clique com botão direito)');
            } else {
              showToast('🔍 Lupa de leitura desativada');
              setIsContextMenuOpen(false);
            }
            return next;
          });
        }
      } else if (e.key === 'Escape' && isActive) {
        setIsActive(false);
        setIsContextMenuOpen(false);
        showToast('🔍 Lupa de leitura desativada');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isActive, showToast]);

  // Track mouse position smoothly
  useEffect(() => {
    if (!isActive) return;

    let animFrameId: number;

    const handleMouseMove = (e: MouseEvent) => {
      mousePosRef.current = { x: e.clientX, y: e.clientY };
      animFrameId = requestAnimationFrame(() => {
        setMousePos({ x: e.clientX, y: e.clientY });
      });
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animFrameId);
    };
  }, [isActive]);

  // Context menu (Right-click) & pointer capture handler when magnifier is active
  useEffect(() => {
    if (!isActive) return;

    // Stop right-click mouse/pointer events from propagating to PageFlip or underlying elements
    const handleRightClickCapture = (e: MouseEvent | PointerEvent) => {
      if (e.button === 2 || e.which === 3) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
      }
    };

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();

      // Ensure context menu stays within viewport
      const x = Math.min(e.clientX, window.innerWidth - 230);
      const y = Math.min(e.clientY, window.innerHeight - 270);
      setMenuPos({ x, y });
      setIsContextMenuOpen(true);
    };

    window.addEventListener('mousedown', handleRightClickCapture, { capture: true });
    window.addEventListener('pointerdown', handleRightClickCapture, { capture: true });
    window.addEventListener('mouseup', handleRightClickCapture, { capture: true });
    window.addEventListener('pointerup', handleRightClickCapture, { capture: true });
    window.addEventListener('auxclick', handleRightClickCapture, { capture: true });
    window.addEventListener('contextmenu', handleContextMenu, { capture: true });

    return () => {
      window.removeEventListener('mousedown', handleRightClickCapture, { capture: true });
      window.removeEventListener('pointerdown', handleRightClickCapture, { capture: true });
      window.removeEventListener('mouseup', handleRightClickCapture, { capture: true });
      window.removeEventListener('pointerup', handleRightClickCapture, { capture: true });
      window.removeEventListener('auxclick', handleRightClickCapture, { capture: true });
      window.removeEventListener('contextmenu', handleContextMenu, { capture: true });
    };
  }, [isActive]);

  // Close context menu on left click outside menu
  useEffect(() => {
    if (!isContextMenuOpen) return;

    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.magnifier-context-menu')) {
        setIsContextMenuOpen(false);
      }
    };

    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, [isContextMenuOpen]);

  // Draw on Canvas when cursor is over <canvas> elements (PDF / 3D Book)
  useEffect(() => {
    if (!isActive || !lensCanvasRef.current) return;

    const canvas = lensCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x: mouseX, y: mouseY } = mousePos;

    ctx.clearRect(0, 0, lensSize, lensSize);

    // Find all canvas elements in the app
    const srcCanvases = Array.from(document.querySelectorAll('canvas')).filter(
      (c) => c !== canvas && c.offsetWidth > 0 && c.offsetHeight > 0
    );

    let drewCanvas = false;

    for (const srcCanvas of srcCanvases) {
      const rect = srcCanvas.getBoundingClientRect();

      // Check if mouse is within or near this canvas
      if (
        mouseX >= rect.left - 20 &&
        mouseX <= rect.right + 20 &&
        mouseY >= rect.top - 20 &&
        mouseY <= rect.bottom + 20
      ) {
        const scaleX = srcCanvas.width / rect.width;
        const scaleY = srcCanvas.height / rect.height;

        const relX = mouseX - rect.left;
        const relY = mouseY - rect.top;

        const srcCenterX = relX * scaleX;
        const srcCenterY = relY * scaleY;

        const srcCropW = (lensSize / zoomLevel) * scaleX;
        const srcCropH = (lensSize / zoomLevel) * scaleY;

        const srcCropX = srcCenterX - srcCropW / 2;
        const srcCropY = srcCenterY - srcCropH / 2;

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        try {
          ctx.drawImage(
            srcCanvas,
            srcCropX,
            srcCropY,
            srcCropW,
            srcCropH,
            0,
            0,
            lensSize,
            lensSize
          );
          drewCanvas = true;
        } catch (err) {
          // Ignore cross-origin error if canvas is tainted
        }
      }
    }

    setHasCanvasUnderCursor(drewCanvas);
  }, [isActive, mousePos, lensSize, zoomLevel]);

  // Mirror DOM elements for non-canvas text / markdown
  useEffect(() => {
    if (!isActive) return;

    const { x: mouseX, y: mouseY } = mousePos;
    if (mouseX < 0 || mouseY < 0) return;

    const elUnderCursor = document.elementFromPoint(mouseX, mouseY) as HTMLElement;
    if (!elUnderCursor) return;

    const targetEl = elUnderCursor.closest<HTMLElement>(
      '.markdown-content, .pdf-page-wrapper, .react-pdf__Page, main, #root'
    );

    if (targetEl && mirrorContainerRef.current) {
      if (lastTargetNodeRef.current !== targetEl) {
        lastTargetNodeRef.current = targetEl;
        mirrorContainerRef.current.innerHTML = '';
        const clone = targetEl.cloneNode(true) as HTMLElement;
        clone.style.pointerEvents = 'none';
        clone.style.margin = '0';
        mirrorContainerRef.current.appendChild(clone);
      }

      // Position inner clone
      const rect = targetEl.getBoundingClientRect();
      const relX = mouseX - rect.left;
      const relY = mouseY - rect.top;

      const innerDiv = mirrorContainerRef.current.firstElementChild as HTMLElement;
      if (innerDiv) {
        innerDiv.style.position = 'absolute';
        innerDiv.style.left = `${lensSize / 2 - relX * zoomLevel}px`;
        innerDiv.style.top = `${lensSize / 2 - relY * zoomLevel}px`;
        innerDiv.style.width = `${rect.width}px`;
        innerDiv.style.height = `${rect.height}px`;
        innerDiv.style.transform = `scale(${zoomLevel})`;
        innerDiv.style.transformOrigin = '0 0';
      }
    }
  }, [isActive, mousePos, lensSize, zoomLevel]);

  if (!isActive) {
    return (
      <>
        {/* Toast Notification when activated/deactivated */}
        {toastMessage && (
          <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[10000] bg-black/90 text-amber-300 border border-amber-500/30 px-5 py-2.5 rounded-2xl shadow-2xl backdrop-blur-xl text-xs font-bold animate-in fade-in slide-in-from-top duration-300 flex items-center gap-2 pointer-events-none select-none">
            {toastMessage}
          </div>
        )}
      </>
    );
  }

  const lensLeft = mousePos.x - lensSize / 2;
  const lensTop = mousePos.y - lensSize / 2;

  return (
    <>
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[10000] bg-black/90 text-amber-300 border border-amber-500/30 px-5 py-2.5 rounded-2xl shadow-2xl backdrop-blur-xl text-xs font-bold animate-in fade-in slide-in-from-top duration-300 flex items-center gap-2 pointer-events-none select-none">
          {toastMessage}
        </div>
      )}

      {/* Magnifier Lens Body */}
      <div
        className="fixed z-[9990] pointer-events-none rounded-full overflow-hidden select-none transition-transform duration-75 ease-out shadow-[0_20px_50px_rgba(0,0,0,0.8),0_0_0_2px_rgba(245,158,11,0.6),inset_0_0_20px_rgba(255,255,255,0.2)] bg-bg-main"
        style={{
          left: `${lensLeft}px`,
          top: `${lensTop}px`,
          width: `${lensSize}px`,
          height: `${lensSize}px`,
        }}
      >
        {/* DOM Mirror Layer for HTML Text */}
        <div
          ref={mirrorContainerRef}
          className={`absolute inset-0 rounded-full overflow-hidden ${hasCanvasUnderCursor ? 'opacity-0' : 'opacity-100'}`}
        />

        {/* Canvas Layer for PDF / 3D Book pages */}
        <canvas
          ref={lensCanvasRef}
          width={lensSize}
          height={lensSize}
          className={`absolute inset-0 w-full h-full rounded-full object-cover ${hasCanvasUnderCursor ? 'opacity-100' : 'opacity-0'}`}
        />

        {/* Glass Reflection Highlight */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-transparent via-white/5 to-white/20 pointer-events-none border border-white/20" />

        {/* Center Target Dot */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full border border-amber-400/80 bg-amber-400/20 pointer-events-none" />

        {/* Zoom Badge */}
        <div className="absolute bottom-2 right-1/2 translate-x-1/2 bg-black/80 backdrop-blur-md border border-amber-500/40 text-amber-300 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold tracking-tight shadow-md">
          {zoomLevel.toFixed(1)}x
        </div>
      </div>

      {/* Context Menu on Right Click */}
      {isContextMenuOpen && (
        <div
          className="magnifier-context-menu fixed z-[10001] bg-bg-card/95 backdrop-blur-2xl border border-border-strong rounded-2xl p-3 shadow-2xl w-56 text-text-primary text-xs flex flex-col gap-3 animate-in fade-in zoom-in duration-150"
          style={{
            left: `${menuPos.x}px`,
            top: `${menuPos.y}px`,
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border-subtle pb-2">
            <div className="flex items-center gap-1.5 font-bold text-amber-400 text-xs">
              <Search className="w-3.5 h-3.5" />
              <span>Lupa de Leitura</span>
            </div>
            <button
              onClick={() => setIsContextMenuOpen(false)}
              className="p-1 hover:bg-border-subtle rounded-lg text-text-muted hover:text-text-primary transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Zoom Level Control */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-[11px] text-text-muted font-medium">
              <span>Zoom:</span>
              <span className="font-bold text-text-primary font-mono">{zoomLevel.toFixed(1)}x</span>
            </div>
            <div className="flex items-center gap-1.5 bg-bg-main p-1 rounded-xl border border-border-subtle">
              <button
                onClick={() => setZoomLevel((z) => Math.max(1.25, parseFloat((z - 0.25).toFixed(2))))}
                disabled={zoomLevel <= 1.25}
                className="flex-1 py-1 flex items-center justify-center gap-1 bg-bg-card hover:bg-border-subtle disabled:opacity-30 rounded-lg font-bold text-text-primary transition-colors"
                title="Diminuir Zoom"
              >
                <ZoomOut className="w-3.5 h-3.5" />
                <span>-</span>
              </button>
              <button
                onClick={() => setZoomLevel((z) => Math.min(4.0, parseFloat((z + 0.25).toFixed(2))))}
                disabled={zoomLevel >= 4.0}
                className="flex-1 py-1 flex items-center justify-center gap-1 bg-bg-card hover:bg-border-subtle disabled:opacity-30 rounded-lg font-bold text-text-primary transition-colors"
                title="Aumentar Zoom"
              >
                <ZoomIn className="w-3.5 h-3.5" />
                <span>+</span>
              </button>
            </div>
          </div>

          {/* Lens Size Control */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-[11px] text-text-muted font-medium">
              <span>Tamanho:</span>
              <span className="font-bold text-text-primary font-mono">{lensSize}px</span>
            </div>
            <div className="flex items-center gap-1.5 bg-bg-main p-1 rounded-xl border border-border-subtle">
              <button
                onClick={() => setLensSize((s) => Math.max(160, s - 30))}
                disabled={lensSize <= 160}
                className="flex-1 py-1 flex items-center justify-center gap-1 bg-bg-card hover:bg-border-subtle disabled:opacity-30 rounded-lg font-bold text-text-primary transition-colors"
                title="Diminuir Tamanho"
              >
                <Minimize2 className="w-3 h-3" />
                <span>Menor</span>
              </button>
              <button
                onClick={() => setLensSize((s) => Math.min(320, s + 30))}
                disabled={lensSize >= 320}
                className="flex-1 py-1 flex items-center justify-center gap-1 bg-bg-card hover:bg-border-subtle disabled:opacity-30 rounded-lg font-bold text-text-primary transition-colors"
                title="Aumentar Tamanho"
              >
                <Maximize2 className="w-3 h-3" />
                <span>Maior</span>
              </button>
            </div>
          </div>

          {/* Close / Disable Magnifier */}
          <button
            onClick={() => {
              setIsActive(false);
              setIsContextMenuOpen(false);
              showToast('🔍 Lupa de leitura desativada');
            }}
            className="w-full mt-1 py-2 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 font-bold rounded-xl transition-all flex items-center justify-center gap-2 text-xs"
          >
            <X className="w-3.5 h-3.5" />
            <span>Desativar Lupa (Ctrl 3x)</span>
          </button>
        </div>
      )}
    </>
  );
}
