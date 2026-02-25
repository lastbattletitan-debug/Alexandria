import { Teacher, ChatMessage } from '../types';

export async function chatWithTeacher(
  teacher: Teacher,
  message: string,
  history: ChatMessage[]
): Promise<string> {
  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ teacher, message, history }),
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

export async function generateSummary(teacher: Teacher): Promise<string> {
  if (teacher.files.length === 0) {
    return 'Nenhum arquivo disponível para sumarizar.';
  }

  try {
    const response = await fetch('/api/summary', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ teacher }),
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
