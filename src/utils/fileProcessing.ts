import { GoogleGenAI } from "@google/genai";
import { extractTextFromPdf } from './pdfUtils';

export async function processFile(file: File): Promise<string> {
  const fileType = file.type;
  
  if (fileType === 'application/pdf') {
    return await extractTextFromPdf(file);
  }
  
  if (fileType.startsWith('text/') || file.name.endsWith('.md') || file.name.endsWith('.txt')) {
    return await file.text();
  }
  
  if (fileType.startsWith('image/')) {
    return await processImageWithGemini(file);
  }
  
  if (fileType.startsWith('video/')) {
    return await processVideoWithGemini(file);
  }
  
  throw new Error(`Tipo de arquivo não suportado: ${fileType}`);
}

async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      // Remove Data URL prefix (e.g., "data:image/jpeg;base64,")
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = error => reject(error);
  });
}

async function processImageWithGemini(file: File): Promise<string> {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY não configurada.");

    const ai = new GoogleGenAI({ apiKey });
    const base64Data = await fileToBase64(file);

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        {
          role: "user",
          parts: [
            { text: "Descreva detalhadamente esta imagem para que ela possa ser usada como contexto em uma base de conhecimento (RAG). Inclua todos os textos visíveis, objetos, cenas e detalhes relevantes." },
            { inlineData: { mimeType: file.type, data: base64Data } }
          ]
        }
      ]
    });

    return response.text || "Não foi possível gerar descrição para a imagem.";
  } catch (error) {
    console.error("Erro ao processar imagem com Gemini:", error);
    return "Erro ao processar imagem. Tente novamente.";
  }
}

async function processVideoWithGemini(file: File): Promise<string> {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY não configurada.");

    const ai = new GoogleGenAI({ apiKey });
    const base64Data = await fileToBase64(file);

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        {
          role: "user",
          parts: [
            { text: "Assista a este vídeo e faça uma transcrição detalhada e um resumo completo do conteúdo, focando em informações úteis para uma base de conhecimento. Se houver fala, transcreva. Se for visual, descreva." },
            { inlineData: { mimeType: file.type, data: base64Data } }
          ]
        }
      ]
    });

    return response.text || "Não foi possível gerar descrição para o vídeo.";
  } catch (error) {
    console.error("Erro ao processar vídeo com Gemini:", error);
    return "Erro ao processar vídeo. Verifique se o tamanho é suportado (máx 20MB recomendado para upload direto).";
  }
}
