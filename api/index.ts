import express from "express";
import { GoogleGenAI } from "@google/genai";

const app = express();
app.use(express.json({ limit: '50mb' }));

app.post("/api/chat", async (req, res) => {
  try {
    const { teacher, message, history } = req.body;
    
    if (!process.env.GEMINI_API_KEY) {
      return res.status(400).json({ error: 'GEMINI_API_KEY is not set on the server.' });
    }

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    const contents = history.map((msg: any) => ({
      role: msg.role,
      parts: [{ text: msg.text }],
    }));

    contents.push({
      role: 'user',
      parts: [{ text: message }],
    });

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: contents,
      config: {
        systemInstruction: teacher.systemInstruction,
      },
    });

    res.json({ text: response.text });
  } catch (error: any) {
    console.error('Error in /api/chat:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

app.post("/api/summary", async (req, res) => {
  try {
    const { teacher } = req.body;

    if (!process.env.GEMINI_API_KEY) {
      return res.status(400).json({ error: 'GEMINI_API_KEY is not set on the server.' });
    }

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    if (!teacher.files || teacher.files.length === 0) {
      return res.json({ text: 'Nenhum arquivo disponível para sumarizar.' });
    }

    const parts: any[] = teacher.files.map((file: any) => {
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

    res.json({ text: response.text });
  } catch (error: any) {
    console.error('Error in /api/summary:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

export default app;
