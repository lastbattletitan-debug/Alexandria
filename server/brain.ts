import { GoogleGenAI } from "@google/genai";
import { buscarChunksRelevantes } from './vectorSearch';
import { adicionarAoHistorico, obterHistorico } from './chatMemory';

const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

export async function responderPergunta(professorId: string, sessionId: string, pergunta: string) {
  if (!apiKey) throw new Error('GEMINI_API_KEY is missing');
  
  const ai = new GoogleGenAI({ apiKey });

  // 1. Search for relevant chunks
  const relevantChunks = await buscarChunksRelevantes(professorId, pergunta);
  
  // 2. Build context
  const context = relevantChunks.length > 0
    ? relevantChunks.map((c, i) => `Trecho ${i + 1}: ${c.chunk}`).join('\n\n')
    : '';

  // 3. Get history
  const history = obterHistorico(sessionId);
  
  // 4. Prepare Gemini contents
  const contents = history.map(msg => ({
    role: msg.role,
    parts: [{ text: msg.content }]
  }));
  
  // Add current question
  contents.push({ role: 'user', parts: [{ text: pergunta }] });

  // 5. System Instruction
  let systemInstruction = '';
  if (context) {
    systemInstruction = `Você é um professor virtual. Use APENAS os trechos de conhecimento fornecidos abaixo para responder à pergunta do aluno.
    
    CONHECIMENTO DISPONÍVEL:
    ${context}
    
    REGRAS:
    - Responda APENAS com base nos trechos acima.
    - Cite qual trecho usou na resposta (ex: "Conforme o Trecho 2...").
    - Se a resposta não estiver nos trechos, diga educadamente que não encontrou essa informação no material carregado.
    - Mantenha um tom educativo e profissional.`;
  } else {
    systemInstruction = `Você é um professor virtual educativo. No momento, não há material de estudo (PDF) carregado para este professor.
    Responda de forma geral e educativa, mas oriente o aluno a carregar um PDF na seção "Cérebro do Professor" para que você possa ser mais específico.`;
  }

  // 6. Generate Response
  const response = await ai.models.generateContent({
    model: 'gemini-1.5-flash',
    contents: contents,
    config: {
      systemInstruction: systemInstruction,
      temperature: 0.3, // Lower temperature for more factual responses
    },
  });

  const responseText = response.text || "Desculpe, não consegui gerar uma resposta.";

  // 7. Save to history
  adicionarAoHistorico(sessionId, 'user', pergunta);
  adicionarAoHistorico(sessionId, 'model', responseText);

  return {
    resposta: responseText,
    fontes: relevantChunks.map(c => ({ trecho: c.chunk, relevancia: c.score }))
  };
}
