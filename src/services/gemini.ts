import { GoogleGenAI } from '@google/genai';
import { Teacher, ChatMessage, TeacherFile, Topic } from '../types';

const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
const ai = new GoogleGenAI({ apiKey: apiKey || '' });

export async function chatWithTeacher(
  teacher: Teacher,
  message: string,
  history: ChatMessage[],
  selectedFileIds?: string[],
  topic?: Topic
): Promise<string> {
  if (!apiKey) {
    return 'Erro: Chave de API do Gemini não configurada.';
  }

  try {
    const chat = ai.chats.create({
      model: 'gemini-3-flash-preview',
      config: {
        systemInstruction: teacher.systemInstruction,
      },
      history: history.map((msg) => ({ role: msg.role, parts: [{ text: msg.text }] })),
    });

    const response = await chat.sendMessage({ message });
    return response.text || 'Desculpe, não consegui responder.';
  } catch (error) {
    console.error('Error chatting with teacher:', error);
    return 'Ocorreu um erro ao processar sua mensagem.';
  }
}

export async function generateSummary(teacher: Teacher, selectedFiles?: TeacherFile[]): Promise<string> {
  if (!apiKey) {
    return 'Erro: Chave de API do Gemini não configurada.';
  }

  const filesToSummarize = selectedFiles || teacher.files;
  
  if (filesToSummarize.length === 0) {
    return 'Nenhum arquivo disponível para sumarizar.';
  }

  try {
    const fileContent = filesToSummarize.map((f) => `--- INÍCIO DO ARQUIVO: ${f.name} ---\n\n${f.data}\n\n--- FIM DO ARQUIVO: ${f.name} ---`).join('\n\n');
    const prompt = `Você é um especialista em ${teacher.specialty}. Resuma o seguinte conteúdo de forma concisa e clara:\n\n${fileContent}`;
    
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: { parts: [{ text: prompt }] },
    });

    return response.text || 'Não foi possível gerar o sumário.';
  } catch (error) {
    console.error('Error generating summary:', error);
    return 'Ocorreu um erro ao gerar o sumário dos arquivos.';
  }
}
