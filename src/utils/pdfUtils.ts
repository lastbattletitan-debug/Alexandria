import * as pdfjsLib from 'pdfjs-dist';

// Configurar o worker do PDF.js
// Usando CDN para evitar problemas de build com Vite/Webpack
// Importante: Usar .mjs para compatibilidade com módulos ES
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.mjs`;

export async function generatePdfThumbnail(file: File): Promise<string> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    
    // Pegar a primeira página
    const page = await pdf.getPage(1);
    
    // Definir escala para thumbnail
    const viewport = page.getViewport({ scale: 1.0 });
    
    // Criar canvas
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    
    if (!context) {
      throw new Error('Canvas context not available');
    }
    
    canvas.height = viewport.height;
    canvas.width = viewport.width;
    
    // Renderizar página no canvas
    await page.render({
      canvasContext: context,
      viewport: viewport
    } as any).promise;
    
    // Retornar imagem como Data URL
    return canvas.toDataURL('image/jpeg', 0.8);
  } catch (error) {
    console.error('Error generating PDF thumbnail:', error);
    return ''; // Retorna string vazia em caso de erro
  }
}
