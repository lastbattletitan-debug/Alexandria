import { Teacher, ChatMessage, TeacherFile, Topic } from '../types';
import { GoogleGenAI } from "@google/genai";

const CHUNK_SIZE = 20000; // Reduced chunk size for better reliability with Groq TPM limits

function splitTextIntoChunks(text: string, chunkSize: number): string[] {
  const chunks: string[] = [];
  for (let i = 0; i < text.length; i += chunkSize) {
    chunks.push(text.slice(i, i + chunkSize));
  }
  return chunks;
}

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function callAiApi(text: string, prompt: string, history?: ChatMessage[]): Promise<string> {
  const response = await fetch('/api/ai', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text,
      prompt,
      history
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    console.error('AI API Error Details:', errorData);
    
    // Check for Rate Limit (429)
    if (response.status === 429) {
      throw new Error('RATE_LIMIT_EXCEEDED');
    }

    if (response.status === 413) {
      throw new Error('Chunk muito grande. Erro interno na divisão do texto.');
    }
    
    // Try to extract a meaningful message
    const errorMessage = errorData.details || errorData.error?.message || JSON.stringify(errorData);
    throw new Error(errorMessage);
  }

  const data = await response.json();
  return data.text;
}

// Wrapper with Retry Logic for Rate Limits
async function callAiApiWithRetry(text: string, prompt: string, history?: ChatMessage[], retries = 3): Promise<string> {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      return await callAiApi(text, prompt, history);
    } catch (error: any) {
      const isRateLimit = error.message === 'RATE_LIMIT_EXCEEDED' || 
                          error.message?.includes('429') || 
                          error.message?.includes('quota') ||
                          error.message?.includes('rate_limit') ||
                          error.message?.includes('Too Many Requests') ||
                          error.message?.includes('TPM') ||
                          error.message?.includes('RPM');
      
      if (isRateLimit) {
        if (attempt < retries - 1) {
          // Groq TPM limits reset every minute. We need longer delays.
          const waitTime = 15000 * (attempt + 1); // 15s, 30s, 45s
          console.warn(`Rate limit hit. Retrying in ${waitTime}ms...`);
          await delay(waitTime);
          continue;
        } else {
          throw new Error('Limite de requisições excedido. Tente novamente mais tarde.');
        }
      }
      throw error;
    }
  }
  throw new Error('Falha após múltiplas tentativas.');
}

// Helper for semantic search (keyword-based for client-side efficiency)
function findRelevantChunks(text: string, query: string, maxChunks = 5, chunkSize = 2000): string {
  if (!text || !query) return "";

  const chunks = splitTextIntoChunks(text, chunkSize);
  const queryTerms = query.toLowerCase().split(/\s+/).filter(t => t.length > 3); // Filter small words

  if (queryTerms.length === 0) return text.substring(0, 20000); // Fallback if query is too simple

  const scoredChunks = chunks.map(chunk => {
    const chunkLower = chunk.toLowerCase();
    let score = 0;
    queryTerms.forEach(term => {
      // Simple frequency count
      const regex = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
      const count = (chunkLower.match(regex) || []).length;
      score += count;
    });
    return { chunk, score };
  });

  // Sort by score descending
  scoredChunks.sort((a, b) => b.score - a.score);

  // Take top chunks
  const topChunks = scoredChunks.slice(0, maxChunks).filter(c => c.score > 0);
  
  // If no relevant chunks found, return the beginning of text as fallback
  if (topChunks.length === 0) return text.substring(0, 20000);

  return topChunks.map(c => c.chunk).join('\n\n[...]\n\n');
}

export async function chatWithTeacher(
  teacher: Teacher,
  message: string,
  history: ChatMessage[],
  selectedFileIds?: string[],
  topic?: Topic
): Promise<string> {
  try {
    // Truncate history to last 10 messages to save tokens while maintaining context
    const truncatedHistory = history.slice(-10);
    
    let prompt = teacher.systemInstruction;

    // Add file context
    const filesToUse = selectedFileIds && selectedFileIds.length > 0 
      ? teacher.files.filter(f => selectedFileIds.includes(f.id))
      : teacher.files;

    if (filesToUse.length > 0) {
      const fullContextText = filesToUse
        .filter(f => f.data && f.data.trim().length > 0)
        .map(f => `--- CONTEÚDO DO ARQUIVO: ${f.name} ---\n${f.data}`)
        .join('\n\n');
        
      if (fullContextText) {
        // Check if user wants full detail
        const isDetailRequest = /(detalhe|expli(?:que|ca) (?:tudo|detalhadamente)|aprofund(?:e|ar)|completo|integra|tudo sobre)/i.test(message);
        
        let finalContext = "";

        if (isDetailRequest) {
           // User wants EVERYTHING. Send as much as possible (up to safe limit).
           const MAX_CONTEXT_LENGTH = 200000;
           finalContext = fullContextText.length > MAX_CONTEXT_LENGTH 
            ? fullContextText.substring(0, MAX_CONTEXT_LENGTH) + "\n\n[... O restante do conteúdo foi truncado por ser muito longo ...]"
            : fullContextText;
           
           prompt += `\n\n=== MODO DETALHADO ATIVADO ===\nO usuário solicitou uma explicação detalhada. Use o contexto abaixo para fornecer uma resposta completa, abrangente e profunda.`;

        } else {
           // Semantic Search Mode (NotebookLM style)
           // Extract only relevant parts to save tokens and focus attention
           const relevantText = findRelevantChunks(fullContextText, message, 8, 3000); // ~24k chars max
           
           finalContext = relevantText;
           prompt += `\n\n=== MODO DE BUSCA SEMÂNTICA ===\nBaseie-se nos trechos abaixo, que foram selecionados por relevância à pergunta do usuário. Se a resposta não estiver clara nestes trechos, avise o usuário.`;
        }

        prompt += `\n\n=== INSTRUÇÕES DE ANÁLISE DE FONTES ===\nVocê tem acesso aos documentos abaixo para basear suas respostas. Siga estas diretrizes ESTRITAMENTE:\n1. Forneça respostas EXTENSAS, PROFUNDAS e EXTREMAMENTE DETALHADAS.\n2. Analise criticamente o conteúdo, fazendo conexões inteligentes e explicando o contexto, o "porquê" e o "como".\n3. Cite conceitos, exemplos ou trechos específicos dos documentos para embasar sua resposta.\n4. Estruture sua resposta de forma didática (use parágrafos bem desenvolvidos, tópicos se ajudar na clareza, e uma conclusão).\n5. Se a resposta não estiver nos documentos, use seu conhecimento geral, mas dê preferência absoluta aos documentos fornecidos.\n\n=== DOCUMENTOS DE REFERÊNCIA ===\n${finalContext}`;
      }
    }

    return await callAiApiWithRetry(message, prompt, truncatedHistory);
  } catch (error) {
    console.error('Error chatting with teacher:', error);
    return 'Desculpe, não consegui responder no momento. Tente novamente mais tarde.';
  }
}

export async function generateSummary(teacher: Teacher, selectedFiles?: TeacherFile[]): Promise<string> {
  const filesToSummarize = selectedFiles || teacher.files;
  
  if (filesToSummarize.length === 0) {
    return 'Nenhum arquivo disponível para sumarizar.';
  }

  try {
    // 1. Combine all file content (filter out empty data)
    const validFiles = filesToSummarize.filter(f => f.data && f.data.trim().length > 0);
    
    if (validFiles.length === 0) {
        return 'Nenhum conteúdo válido encontrado nos arquivos selecionados.';
    }

    const fullText = validFiles
      .map((f) => `--- ARQUIVO: ${f.name} ---\n${f.data}`)
      .join('\n\n');

    // Limit the text to summarize to avoid massive API costs and rate limits
    const MAX_SUMMARY_LENGTH = 100000;
    const textToSummarize = fullText.length > MAX_SUMMARY_LENGTH 
      ? fullText.substring(0, MAX_SUMMARY_LENGTH) + "\n\n[... O restante do documento foi omitido para o sumário ...]"
      : fullText;

    // 2. Split into manageable chunks
    const chunks = splitTextIntoChunks(textToSummarize, CHUNK_SIZE);

    // 3. Process chunks (Map phase)
    if (chunks.length === 1) {
      const prompt = `Aja como um especialista em ${teacher.specialty}. Crie um índice estruturado e hierárquico dos tópicos e subtópicos deste conteúdo. Seja direto e use Português do Brasil.`;
      return await callAiApiWithRetry(chunks[0], prompt);
    }

    const partialSummaries: string[] = [];
    
    for (let i = 0; i < chunks.length; i++) {
      const chunkPrompt = `Extraia apenas os tópicos principais (índice) desta parte (${i + 1}/${chunks.length}) de um documento. Seja extremamente conciso. Ignore erros de formatação.`;
      
      try {
        const summary = await callAiApiWithRetry(chunks[i], chunkPrompt);
        if (summary && !summary.includes("Erro na parte")) {
             partialSummaries.push(summary);
        }
        
        // Increased delay between chunks to avoid rate limits
        if (i < chunks.length - 1) {
          await delay(4000); 
        }
      } catch (err) {
        console.error(`Erro ao processar parte ${i + 1}:`, err);
        // Do not add error messages to the partial summaries to avoid confusing the final consolidation
      }
    }

    if (partialSummaries.length === 0) {
        return 'Não foi possível gerar o sumário. Ocorreram erros ao processar todas as partes do documento.';
    }

    // 4. Consolidate summaries (Reduce phase)
    const combinedSummaries = partialSummaries.join('\n');
    const finalPrompt = `Aja como um especialista em ${teacher.specialty}. Consolide os seguintes tópicos extraídos de diferentes partes de um documento em um único índice final organizado, hierárquico e sem redundâncias. Use Português do Brasil. Ignore quaisquer menções a erros de processamento se houver.`;

    return await callAiApiWithRetry(combinedSummaries, finalPrompt);

  } catch (error) {
    console.error('Error generating summary:', error);
    if (error instanceof Error) {
      return `Erro ao gerar resumo: ${error.message}`;
    }
    return 'Ocorreu um erro ao gerar o sumário dos arquivos.';
  }
}

export async function analyzePersonalityLinks(links: string): Promise<string> {
  if (!links || !links.trim()) {
    throw new Error('Nenhum link fornecido para análise.');
  }

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    
    const prompt = `Acesse e analise os seguintes links (vídeos do YouTube, artigos, etc) para entender a personalidade da pessoa neles.
Extraia profundamente:
1. O estilo de fala (formal, informal, gírias, ritmo)
2. O humor e tom (sarcástico, motivacional, acadêmico, agressivo, calmo)
3. Vícios de linguagem ou frases de efeito comuns
4. Como a pessoa estrutura seus pensamentos

Crie um perfil detalhado em primeira pessoa ("Eu sou...") de como eu devo agir para imitar essa pessoa perfeitamente em um chat.

Links para análise:
${links}

Retorne APENAS o perfil de personalidade detalhado, sem introduções ou conclusões extras.`;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    if (!response.text) {
      throw new Error('A IA não retornou nenhum texto.');
    }

    return response.text;
  } catch (error) {
    console.error("Error analyzing personality links:", error);
    throw new Error("Falha ao analisar os links com a IA. Verifique se os links são públicos e válidos.");
  }
}
