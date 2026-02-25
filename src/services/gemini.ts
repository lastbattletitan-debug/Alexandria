import { Teacher, ChatMessage, TeacherFile, Topic } from '../types';

export async function chatWithTeacher(
  teacher: Teacher,
  message: string,
  history: ChatMessage[],
  selectedFileIds?: string[],
  topic?: Topic
): Promise<string> {
  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ teacher, message, history, selectedFileIds, topic }),
    });

    const data = await response.json();

    if (!response.ok) {
      return `Erro: ${data.error || 'Falha ao comunicar com o servidor'}`;
    }

    return data.text || 'Desculpe, não consegui responder.';
  } catch (error) {
    console.error('Error chatting with teacher:', error);
    return 'Ocorreu um erro ao processar sua mensagem.';
  }
}

export async function generateSummary(teacher: Teacher, selectedFiles?: TeacherFile[]): Promise<string> {
  const filesToSummarize = selectedFiles || teacher.files;
  
  if (filesToSummarize.length === 0) {
    return 'Nenhum arquivo disponível para sumarizar.';
  }

  try {
    const response = await fetch('/api/summary', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ teacher, files: filesToSummarize }),
    });

    const data = await response.json();

    if (!response.ok) {
      return `Erro: ${data.error || 'Falha ao comunicar com o servidor'}`;
    }

    return data.text || 'Não foi possível gerar o sumário.';
  } catch (error) {
    console.error('Error generating summary:', error);
    return 'Ocorreu um erro ao gerar o sumário dos arquivos.';
  }
}
