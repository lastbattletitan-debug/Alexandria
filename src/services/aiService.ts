import { Teacher, ChatMessage, TeacherFile, Topic } from '../types';

const CHUNK_SIZE = 80000; // Reduced chunk size for better reliability

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
          const waitTime = 5000 * (attempt + 1); // Exponential backoff: 5s, 10s, 15s
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
    // 1. Combine all file content (filter out empty data)
    const validFiles = filesToSummarize.filter(f => f.data && f.data.trim().length > 0);
    
    if (validFiles.length === 0) {
        return 'Nenhum conteúdo válido encontrado nos arquivos selecionados.';
    }

    const fullText = validFiles
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
      const chunkPrompt = `Extraia apenas os tópicos principais (índice) desta parte (${i + 1}/${chunks.length}) de um documento. Seja extremamente conciso. Ignore erros de formatação.`;
      
      try {
        const summary = await callAiApiWithRetry(chunks[i], chunkPrompt);
        if (summary && !summary.includes("Erro na parte")) {
             partialSummaries.push(summary);
        }
        
        // Increased delay between chunks to avoid rate limits
        if (i < chunks.length - 1) {
          await delay(2000); 
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
