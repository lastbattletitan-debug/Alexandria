import express from "express";
import { GoogleGenAI } from "@google/genai";
import * as dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

const app = express();
app.use(express.json({ limit: '50mb' }));

/**
 * Validates if the API key is present and has a basic valid format.
 */
function validateApiKey(key: string | undefined): { valid: boolean; error?: string } {
  if (!key || key === 'undefined' || key === 'null' || key.trim() === '') {
    return { valid: false, error: 'A chave da API do Gemini não foi encontrada. Por favor, configure a variável GOOGLE_API_KEY nos Secrets ou no arquivo .env.' };
  }
  
  // Basic check for Gemini API key format (usually starts with AIza)
  if (!key.startsWith('AIza')) {
    return { valid: false, error: 'O formato da chave da API do Gemini parece inválido (deve começar com "AIza"). Verifique se você copiou a chave corretamente.' };
  }

  return { valid: true };
}

/**
 * Helper to load the API key with fallbacks and debug logging
 */
function getApiKey(): string | undefined {
  const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
  
  if (apiKey) {
    const maskedKey = apiKey.length > 8 
      ? `${apiKey.substring(0, 4)}...${apiKey.substring(apiKey.length - 4)}` 
      : '***';
    console.log(`[Debug] API Key carregada com sucesso: ${maskedKey}`);
  } else {
    console.log('[Debug] Nenhuma API Key encontrada nas variáveis de ambiente.');
  }
  
  return apiKey;
}

/**
 * Retry helper for API calls with exponential backoff
 */
async function withRetry<T>(fn: () => Promise<T>, maxRetries = 3, initialDelay = 2000): Promise<T> {
  let lastError: any;
  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      const errorMessage = String(error.message || error);
      
      // Check if error is retryable (503 Unavailable or 429 Rate Limit)
      const isRetryable = 
        errorMessage.includes('503') || 
        errorMessage.includes('UNAVAILABLE') || 
        errorMessage.includes('429') || 
        errorMessage.includes('RESOURCE_EXHAUSTED') ||
        errorMessage.includes('high demand');

      if (isRetryable && i < maxRetries) {
        const delay = initialDelay * Math.pow(2, i);
        console.log(`[Retry] Erro temporário da API (Tentativa ${i + 1}/${maxRetries}). Tentando novamente em ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw error;
    }
  }
  throw lastError;
}

app.post("/api/chat", async (req, res) => {
  try {
    const { teacher, message, history, selectedFileIds, topic } = req.body;
    
    const apiKey = getApiKey();
    const validation = validateApiKey(apiKey);

    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }

    const ai = new GoogleGenAI({ apiKey: apiKey! });

    const contents = history.map((msg: any) => ({
      role: msg.role,
      parts: [{ text: msg.text }],
    }));

    const userParts: any[] = [{ text: message }];

    // If specific files are selected for this message, include them
    if (selectedFileIds && selectedFileIds.length > 0) {
      const selectedFiles = teacher.files.filter((f: any) => selectedFileIds.includes(f.id));
      
      selectedFiles.forEach((file: any) => {
        if (file.type === 'file' && file.data) {
          userParts.push({
            inlineData: {
              mimeType: file.mimeType,
              data: file.data,
            },
          });
          userParts.push({ text: `[Contexto do arquivo: ${file.name}]` });
        } else if (file.type === 'link' && file.url) {
          userParts.push({ text: `[Contexto do link: ${file.name} - ${file.url}]` });
        }
      });
      
      userParts.push({ text: "Por favor, responda à minha pergunta acima baseando-se prioritariamente nas fontes que anexei a esta mensagem específica." });
    }

    contents.push({
      role: 'user',
      parts: userParts,
    });

    let systemInstruction = teacher.systemInstruction;
    
    if (teacher.personality) {
      systemInstruction += `\n\nSUA PERSONALIDADE: ${teacher.personality}`;
    }
    
    if (teacher.description) {
      systemInstruction += `\n\nSOBRE VOCÊ: ${teacher.description}`;
    }

    if (topic) {
      systemInstruction += `\n\nCONTEXTO DO TÓPICO ATUAL: Você está conversando dentro do tópico "${topic.name}".`;
      if (topic.description) {
        systemInstruction += `\nDescrição do tópico: ${topic.description}`;
      }
      systemInstruction += `\nPor favor, mantenha suas respostas focadas e restritas ao contexto deste tópico específico.`;
    }

    const response = await withRetry(() => ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: contents,
      config: {
        systemInstruction: systemInstruction,
      },
    }));

    res.json({ text: response.text });
  } catch (error: any) {
    let errorMessage = error.message || error || 'Internal server error';
    if (typeof errorMessage === 'object') {
      errorMessage = JSON.stringify(errorMessage);
    }
    
    const isApiKeyError = String(errorMessage).includes('API key not valid') || String(errorMessage).includes('API_KEY_INVALID');
    const isHighDemand = String(errorMessage).includes('high demand') || String(errorMessage).includes('503');
    
    if (!isApiKeyError && !isHighDemand) {
      console.error('Error in /api/chat:', error);
    }

    if (isApiKeyError) {
      errorMessage = 'A chave da API do Gemini configurada é inválida. Por favor, verifique a variável GOOGLE_API_KEY.';
    } else if (isHighDemand) {
      errorMessage = 'O modelo está com alta demanda no momento. Por favor, tente novamente em alguns instantes.';
    }
    res.status(500).json({ error: errorMessage });
  }
});

app.post("/api/summary", async (req, res) => {
  try {
    const { teacher, files } = req.body;

    const apiKey = getApiKey();
    const validation = validateApiKey(apiKey);

    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }

    const ai = new GoogleGenAI({ apiKey: apiKey! });

    const filesToSummarize = files || teacher.files;

    if (!filesToSummarize || filesToSummarize.length === 0) {
      return res.json({ text: 'Nenhum arquivo disponível para sumarizar.' });
    }

    const parts: any[] = filesToSummarize.map((file: any) => {
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
      text: 'Por favor, analise todas as fontes fornecidas. Para cada fonte, crie um índice/sumário listando TODOS os tópicos e subtópicos contidos nela. Se a fonte for uma imagem, descreva detalhadamente o que ela contém e forneça uma pequena explicação do seu contexto ou conteúdo visual. Se a fonte for um arquivo Markdown (.md), preserve a estrutura de tópicos mas traduza para o Português. Faça referência clara ao nome da fonte. Não resuma o conteúdo textual, apenas liste os tópicos de forma estruturada e hierárquica. IMPORTANTE: Independentemente do idioma original da fonte (mesmo que seja em inglês ou outro idioma), o sumário e as explicações geradas DEVEM ser escritos inteiramente em Português do Brasil.',
    });

    const response = await withRetry(() => ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: { parts },
      config: {
        systemInstruction: 'Você é um assistente especializado em criar sumários e extrair tópicos de arquivos (textos, imagens, etc).',
      },
    }));

    res.json({ text: response.text });
  } catch (error: any) {
    let errorMessage = error.message || error || 'Internal server error';
    if (typeof errorMessage === 'object') {
      errorMessage = JSON.stringify(errorMessage);
    }
    
    const isApiKeyError = String(errorMessage).includes('API key not valid') || String(errorMessage).includes('API_KEY_INVALID');
    const isHighDemand = String(errorMessage).includes('high demand') || String(errorMessage).includes('503');
    
    if (!isApiKeyError && !isHighDemand) {
      console.error('Error in /api/summary:', error);
    }

    if (isApiKeyError) {
      errorMessage = 'A chave da API do Gemini configurada é inválida. Por favor, verifique a variável GOOGLE_API_KEY.';
    } else if (isHighDemand) {
      errorMessage = 'O modelo está com alta demanda no momento. Por favor, tente novamente em alguns instantes.';
    }
    res.status(500).json({ error: errorMessage });
  }
});

export default app;
