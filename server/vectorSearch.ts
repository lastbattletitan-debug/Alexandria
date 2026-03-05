import { GoogleGenAI } from "@google/genai";
import { teacherKnowledge } from './pdfProcessor';

const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

function cosineSimilarity(vecA: number[], vecB: number[]): number {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

export async function buscarChunksRelevantes(professorId: string, pergunta: string, topK = 4) {
  if (!apiKey) throw new Error('GEMINI_API_KEY is missing');
  
  const knowledge = teacherKnowledge[professorId];
  if (!knowledge || !knowledge.chunks.length) {
    return [];
  }

  const ai = new GoogleGenAI({ apiKey });
  
  // 1. Generate embedding for the question
  const result: any = await ai.models.embedContent({
    model: "embedding-001",
    contents: [{ parts: [{ text: pergunta }] }]
  });
  
  const questionEmbedding = result.embeddings?.values || result.embedding?.values;
  if (!questionEmbedding) {
    throw new Error('Failed to generate embedding for question');
  }

  // 2. Calculate similarities
  const similarities = knowledge.embeddings.map((chunkEmbedding, index) => ({
    chunk: knowledge.chunks[index],
    score: cosineSimilarity(questionEmbedding, chunkEmbedding)
  }));

  // 3. Filter and sort
  const relevantChunks = similarities
    .filter(item => item.score > 0.5)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);

  return relevantChunks;
}
