import { Teacher, ChatMessage, TeacherFile, Topic } from '../types';

export async function chatWithTeacher(
  teacher: Teacher,
  message: string,
  history: ChatMessage[],
  selectedFileIds?: string[],
  topic?: Topic
): Promise<string> {
  try {
    // Construir o prompt com base no histórico e na mensagem atual
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

    const response = await fetch('/api/gemini', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: message, 
        prompt: prompt,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to get response from Gemini API');
    }

    const data = await response.json();
    return data.text;
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
    const fileContent = filesToSummarize.map((f) => `--- INÍCIO DO ARQUIVO: ${f.name} ---\n\n${f.data}\n\n--- FIM DO ARQUIVO: ${f.name} ---`).join('\n\n');
    const prompt = `Você é um especialista em ${teacher.specialty}. Resuma o seguinte conteúdo de forma concisa e clara:\n\n${fileContent}`;
    
    const response = await fetch('/api/gemini', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: fileContent,
        prompt: prompt,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Gemini API Error Details:', errorData);
      
      if (response.status === 413) {
        throw new Error('O conteúdo é muito grande para ser processado. Tente enviar arquivos menores.');
      }
      
      throw new Error(errorData.details || errorData.error || 'Failed to get summary from Gemini API');
    }

    const data = await response.json();
    return data.text;
  } catch (error) {
    console.error('Error generating summary:', error);
    return 'Ocorreu um erro ao gerar o sumário dos arquivos.';
  }
}
