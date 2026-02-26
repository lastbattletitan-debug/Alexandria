import express from "express";
import OpenAI from "openai";
import * as dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

const app = express();
app.use(express.json({ limit: '50mb' }));

/**
 * Validates if the API key is present.
 */
function validateApiKey(key: string | undefined): { valid: boolean; error?: string } {
  if (!key || key === 'undefined' || key === 'null' || key.trim() === '') {
    return { valid: false, error: 'A chave da API do Groq não foi encontrada. Por favor, configure a variável GROQ_API_KEY nos Secrets ou no arquivo .env.' };
  }
  
  return { valid: true };
}

/**
 * Helper to load the API key with fallbacks
 */
function getApiKey(): string | undefined {
  return process.env.GROQ_API_KEY || process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
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
        errorMessage.includes('rate_limit');

      if (isRetryable && i < maxRetries) {
        const delay = initialDelay * Math.pow(2, i);
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

    const groq = new OpenAI({
      apiKey: apiKey!,
      baseURL: "https://api.groq.com/openai/v1",
    });

    const messages: any[] = [];

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

    messages.push({ role: "system", content: systemInstruction });

    history.forEach((msg: any) => {
      messages.push({
        role: msg.role === 'model' ? 'assistant' : 'user',
        content: msg.text,
      });
    });

    let userContent = message;

    // If specific files are selected for this message, include them as text context
    if (selectedFileIds && selectedFileIds.length > 0) {
      const selectedFiles = teacher.files.filter((f: any) => selectedFileIds.includes(f.id));
      
      let contextText = "\n\n[CONTEXTO ADICIONAL DAS FONTES SELECIONADAS]:\n";
      selectedFiles.forEach((file: any) => {
        if (file.type === 'file' && file.data) {
          contextText += `--- Conteúdo do arquivo: ${file.name} ---\n${file.data}\n\n`;
        } else if (file.type === 'link' && file.url) {
          contextText += `--- Referência do link: ${file.name} (${file.url}) ---\n\n`;
        }
      });
      
      userContent += contextText + "\nPor favor, responda à minha pergunta acima baseando-se prioritariamente nas fontes que anexei a esta mensagem específica.";
    }

    messages.push({ role: "user", content: userContent });

    const response = await withRetry(() => groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: messages,
    }));

    res.json({ text: response.choices[0].message.content });
  } catch (error: any) {
    let errorMessage = error.message || error || 'Internal server error';
    if (typeof errorMessage === 'object') {
      errorMessage = JSON.stringify(errorMessage);
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

    const groq = new OpenAI({
      apiKey: apiKey!,
      baseURL: "https://api.groq.com/openai/v1",
    });

    const filesToSummarize = files || teacher.files;

    if (!filesToSummarize || filesToSummarize.length === 0) {
      return res.json({ text: 'Nenhum arquivo disponível para sumarizar.' });
    }

    let contextText = "Analise as seguintes fontes:\n\n";
    filesToSummarize.forEach((file: any) => {
      if (file.type === 'file' && file.data) {
        contextText += `--- Fonte: ${file.name} ---\n${file.data}\n\n`;
      } else if (file.type === 'link' && file.url) {
        contextText += `--- Link de referência: ${file.url} (${file.name}) ---\n\n`;
      }
    });

    const prompt = 'Por favor, analise todas as fontes fornecidas. Para cada fonte, crie um índice/sumário listando TODOS os tópicos e subtópicos contidos nela. Se a fonte for uma imagem (descrita em texto), explique seu contexto visual. Se a fonte for um arquivo Markdown (.md), preserve a estrutura de tópicos mas traduza para o Português. Faça referência clara ao nome da fonte. Não resuma o conteúdo textual, apenas liste os tópicos de forma estruturada e hierárquica. IMPORTANTE: Independentemente do idioma original da fonte, o sumário e as explicações geradas DEVEM ser escritos inteiramente em Português do Brasil.';

    const response = await withRetry(() => groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: "system", content: 'Você é um assistente especializado em criar sumários e extrair tópicos de arquivos.' },
        { role: "user", content: contextText + "\n\n" + prompt }
      ],
    }));

    res.json({ text: response.choices[0].message.content });
  } catch (error: any) {
    let errorMessage = error.message || error || 'Internal server error';
    if (typeof errorMessage === 'object') {
      errorMessage = JSON.stringify(errorMessage);
    }
    res.status(500).json({ error: errorMessage });
  }
});

export default app;
