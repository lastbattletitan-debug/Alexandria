import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdf = require('pdf-parse');
import { GoogleGenAI } from "@google/genai";

// In-memory store for teacher knowledge
export const teacherKnowledge: Record<string, { chunks: string[], embeddings: number[][] }> = {};

const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

export async function ingestPDF(professorId: string, pdfBuffer: Buffer) {
  if (!apiKey) throw new Error('GEMINI_API_KEY is missing');
  
  const ai = new GoogleGenAI({ apiKey });

  // 1. Extract text
  const data = await pdf(pdfBuffer);
  const fullText = data.text;

  // 2. Chunking
  const chunkSize = 800;
  const overlap = 150;
  const chunks: string[] = [];
  
  let start = 0;
  while (start < fullText.length) {
    let end = start + chunkSize;
    
    // Try to find a good break point (paragraph or sentence end)
    if (end < fullText.length) {
      const searchRange = fullText.substring(Math.max(0, end - 100), Math.min(fullText.length, end + 100));
      const breakPoint = searchRange.lastIndexOf('\n\n') !== -1 
        ? searchRange.lastIndexOf('\n\n') 
        : (searchRange.lastIndexOf('.') !== -1 ? searchRange.lastIndexOf('.') + 1 : 100);
      
      end = Math.max(0, end - 100) + breakPoint;
    }
    
    const chunk = fullText.substring(start, end).trim();
    if (chunk) chunks.push(chunk);
    
    start = end - overlap;
    if (start < 0) start = 0;
    if (start >= fullText.length) break;
  }

  // 3. Generate Embeddings with Rate Limiting
  const embeddings: number[][] = [];
  
  for (let i = 0; i < chunks.length; i++) {
    // Rate limit: 1 second every 10 chunks
    if (i > 0 && i % 10 === 0) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    const result: any = await ai.models.embedContent({
      model: "embedding-001",
      contents: [{ parts: [{ text: chunks[i] }] }]
    });
    
    if (result.embeddings && result.embeddings.values) {
      embeddings.push(result.embeddings.values);
    } else if (result.embedding && result.embedding.values) {
      embeddings.push(result.embedding.values);
    }
  }

  // 4. Save to memory
  teacherKnowledge[professorId] = { chunks, embeddings };

  return { 
    sucesso: true, 
    chunks: chunks.length, 
    paginas: data.numpages 
  };
}
