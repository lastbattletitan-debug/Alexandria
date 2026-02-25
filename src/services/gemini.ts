import { GoogleGenAI, Type, Modality } from '@google/genai';
import { Teacher, TeacherFile, ChatMessage } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function chatWithTeacher(
  teacher: Teacher,
  message: string,
  history: ChatMessage[]
): Promise<string> {
  try {
    const chat = ai.chats.create({
      model: 'gemini-3-flash-preview',
      config: {
        systemInstruction: teacher.systemInstruction,
      },
    });

    // We need to send history to the chat if we want context, but GoogleGenAI chat doesn't 
    // easily accept a pre-existing history array in the create method.
    // Instead, we can just use generateContent with the full history as contents.
    
    const contents = history.map((msg) => ({
      role: msg.role,
      parts: [{ text: msg.text }],
    }));

    // Add the new user message
    contents.push({
      role: 'user',
      parts: [{ text: message }],
    });

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: contents as any,
      config: {
        systemInstruction: teacher.systemInstruction,
      },
    });

    return response.text || 'Desculpe, não consegui responder.';
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
    const parts: any[] = teacher.files.map((file) => {
      if (file.type === 'file' && file.data) {
        return {
          inlineData: {
            mimeType: file.mimeType,
            data: file.data,
          },
        };
      } else if (file.type === 'link' && file.url) {
        return {
          text: `Link de referência: ${file.url} (${file.name})`,
        };
      }
      return null;
    }).filter(Boolean);

    parts.push({
      text: 'Por favor, analise todas as fontes fornecidas. Para cada fonte, crie um índice/sumário listando TODOS os tópicos e subtópicos contidos nela. Faça referência clara ao nome da fonte. Não resuma o conteúdo, apenas liste os tópicos de forma estruturada e hierárquica. IMPORTANTE: Independentemente do idioma original da fonte (mesmo que seja em inglês ou outro idioma), o sumário gerado DEVE ser escrito inteiramente em Português do Brasil.',
    });

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: { parts },
      config: {
        systemInstruction: 'Você é um assistente especializado em criar sumários e extrair tópicos de arquivos (textos, imagens, etc).',
      },
    });

    return response.text || 'Não foi possível gerar o sumário.';
  } catch (error) {
    console.error('Error generating summary:', error);
    return 'Ocorreu um erro ao gerar o sumário dos arquivos.';
  }
}
