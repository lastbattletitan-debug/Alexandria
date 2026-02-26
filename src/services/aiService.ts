import { Teacher, ChatMessage, TeacherFile, Topic } from '../types';

const CHUNK_SIZE = 10000; // ~10KB per chunk

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
    // We pass the history to the API now for better context handling in Groq
    const prompt = teacher.systemInstruction;

    return await callAiApiWithRetry(message, prompt, history);
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
      const prompt = `Você é um especialista em ${teacher.specialty}. Resuma o seguinte conteúdo de forma concisa e clara:\n\n${chunks[0]}`;
      return await callAiApiWithRetry(chunks[0], prompt);
    }

    const partialSummaries: string[] = [];
    
    for (let i = 0; i < chunks.length; i++) {
      const chunkPrompt = `Você é um especialista em ${teacher.specialty}. Este é a parte ${i + 1} de ${chunks.length} de um texto longo. Resuma esta parte focando nos pontos principais e mantendo a coerência:\n\n${chunks[i]}`;
      
      try {
        const summary = await callAiApiWithRetry(chunks[i], chunkPrompt);
        partialSummaries.push(summary);
        
        // Add a small delay between successful chunks to be nice to the API
        if (i < chunks.length - 1) {
          await delay(2000); 
        }
      } catch (err) {
        console.error(`Erro ao processar parte ${i + 1}:`, err);
        partialSummaries.push(`[Erro ao resumir parte ${i + 1}]`);
      }
    }

    // 4. Consolidate summaries (Reduce phase)
    const combinedSummaries = partialSummaries.join('\n\n---\n\n');
    const finalPrompt = `Você é um especialista em ${teacher.specialty}. Abaixo estão resumos parciais de um texto longo (livro ou documento). Sua tarefa é criar um RESUMO FINAL CONSOLIDADO, coerente e bem estruturado, unindo as informações dos resumos parciais. Ignore redundâncias e foque na narrativa principal e conceitos chave.\n\nResumos Parciais:\n${combinedSummaries}`;

    return await callAiApiWithRetry(combinedSummaries, finalPrompt);

  } catch (error) {
    console.error('Error generating summary:', error);
    if (error instanceof Error) {
      return `Erro ao gerar resumo: ${error.message}`;
    }
    return 'Ocorreu um erro ao gerar o sumário dos arquivos.';
  }
}
