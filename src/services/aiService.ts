import { Teacher, ChatMessage, TeacherFile, Topic } from '../types';

const CHUNK_SIZE = 120000; // ~120KB per chunk - Llama 3.3 has a large context window, so we can send much more at once.

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
                          error.message?.includes('rate_limit');
      
      if (isRateLimit) {
        if (attempt < retries - 1) {
          const waitTime = 65000; 
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
    
    // We pass the history to the API now for better context handling in Groq
    const prompt = teacher.systemInstruction;

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
    // 1. Combine all file content
    const fullText = filesToSummarize
      .map((f) => `--- ARQUIVO: ${f.name} ---\n${f.data}`)
      .join('\n\n');

    // 2. Split into manageable chunks
    const chunks = splitTextIntoChunks(fullText, CHUNK_SIZE);

    // 3. Process chunks (Map phase)
    if (chunks.length === 1) {
      const prompt = `Aja como um especialista em ${teacher.specialty}. Crie um índice estruturado e hierárquico dos tópicos e subtópicos deste conteúdo. Seja direto e use Português do Brasil.`;
      return await callAiApiWithRetry(chunks[0], prompt);
    }

    const partialSummaries: string[] = [];
    
    for (let i = 0; i < chunks.length; i++) {
      const chunkPrompt = `Extraia apenas os tópicos principais (índice) desta parte (${i + 1}/${chunks.length}) de um documento. Seja extremamente conciso.`;
      
      try {
        const summary = await callAiApiWithRetry(chunks[i], chunkPrompt);
        partialSummaries.push(summary);
        
        if (i < chunks.length - 1) {
          await delay(1000); 
        }
      } catch (err) {
        console.error(`Erro ao processar parte ${i + 1}:`, err);
        partialSummaries.push(`[Erro na parte ${i + 1}]`);
      }
    }

    // 4. Consolidate summaries (Reduce phase)
    const combinedSummaries = partialSummaries.join('\n');
    const finalPrompt = `Aja como um especialista em ${teacher.specialty}. Consolide os seguintes tópicos extraídos de um documento em um único índice final organizado, hierárquico e sem redundâncias. Use Português do Brasil.`;

    return await callAiApiWithRetry(combinedSummaries, finalPrompt);

  } catch (error) {
    console.error('Error generating summary:', error);
    if (error instanceof Error) {
      return `Erro ao gerar resumo: ${error.message}`;
    }
    return 'Ocorreu um erro ao gerar o sumário dos arquivos.';
  }
}
