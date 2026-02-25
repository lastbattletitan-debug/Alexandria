import { Teacher, ChatMessage, TeacherFile, Topic } from '../types';

const CHUNK_SIZE = 10000; // ~10KB per chunk, well within Vercel's 4.5MB limit

function splitTextIntoChunks(text: string, chunkSize: number): string[] {
  const chunks: string[] = [];
  for (let i = 0; i < text.length; i += chunkSize) {
    chunks.push(text.slice(i, i + chunkSize));
  }
  return chunks;
}

async function callGeminiApi(text: string, prompt: string): Promise<string> {
  const response = await fetch('/api/gemini', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text,
      prompt,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    console.error('Gemini API Error Details:', errorData);
    
    if (response.status === 413) {
      throw new Error('Chunk muito grande. Erro interno na divisão do texto.');
    }
    
    throw new Error(errorData.details || errorData.error || 'Failed to get response from Gemini API');
  }

  const data = await response.json();
  return data.text;
}

export async function chatWithTeacher(
  teacher: Teacher,
  message: string,
  history: ChatMessage[],
  selectedFileIds?: string[],
  topic?: Topic
): Promise<string> {
  try {
    const historyText = history
      .map((msg) => `${msg.role === 'user' ? 'User' : 'Model'}: ${msg.text}`)
      .join('\n');
    
    const prompt = `
      ${teacher.systemInstruction}
      
      Histórico da conversa:
      ${historyText}
      
      User: ${message}
      Model:
    `;

    return await callGeminiApi(message, prompt);
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
    console.log(`Dividindo texto em ${chunks.length} partes de ~${CHUNK_SIZE} caracteres.`);

    // 3. Process chunks (Map phase)
    // If text is small enough, process directly
    if (chunks.length === 1) {
      const prompt = `Você é um especialista em ${teacher.specialty}. Resuma o seguinte conteúdo de forma concisa e clara:\n\n${chunks[0]}`;
      return await callGeminiApi(chunks[0], prompt);
    }

    // Process chunks sequentially to avoid hitting rate limits too hard, 
    // or use Promise.all for parallelism if rate limits allow.
    // Sequential is safer for stability.
    const partialSummaries: string[] = [];
    
    for (let i = 0; i < chunks.length; i++) {
      console.log(`Processando parte ${i + 1} de ${chunks.length}...`);
      const chunkPrompt = `Você é um especialista em ${teacher.specialty}. Este é a parte ${i + 1} de ${chunks.length} de um texto longo. Resuma esta parte focando nos pontos principais e mantendo a coerência:\n\n${chunks[i]}`;
      
      try {
        const summary = await callGeminiApi(chunks[i], chunkPrompt);
        partialSummaries.push(summary);
      } catch (err) {
        console.error(`Erro ao processar parte ${i + 1}:`, err);
        partialSummaries.push(`[Erro ao resumir parte ${i + 1}]`);
      }
    }

    // 4. Consolidate summaries (Reduce phase)
    console.log('Gerando resumo final consolidado...');
    const combinedSummaries = partialSummaries.join('\n\n---\n\n');
    const finalPrompt = `Você é um especialista em ${teacher.specialty}. Abaixo estão resumos parciais de um texto longo (livro ou documento). Sua tarefa é criar um RESUMO FINAL CONSOLIDADO, coerente e bem estruturado, unindo as informações dos resumos parciais. Ignore redundâncias e foque na narrativa principal e conceitos chave.\n\nResumos Parciais:\n${combinedSummaries}`;

    // If combined summaries are still too large, we might need another recursive step, 
    // but for most books, the summaries shouldn't exceed the limit.
    return await callGeminiApi(combinedSummaries, finalPrompt);

  } catch (error) {
    console.error('Error generating summary:', error);
    if (error instanceof Error) {
      return `Erro ao gerar resumo: ${error.message}`;
    }
    return 'Ocorreu um erro ao gerar o sumário dos arquivos.';
  }
}
