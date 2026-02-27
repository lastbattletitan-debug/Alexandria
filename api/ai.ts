import OpenAI from "openai";
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Try to find the API key in various common environment variables
  const apiKey = process.env.GROQ_API_KEY || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.API_KEY;

  // Check if API key is configured
  if (!apiKey) {
    return res.status(500).json({ 
      error: 'Server configuration error: Groq API Key is missing. Please add GROQ_API_KEY to your environment variables.' 
    });
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { text, prompt, history } = req.body;

    if (!text && !prompt) {
      return res.status(400).json({ error: 'Content is required' });
    }

    // Initialize Groq client (OpenAI compatible)
    const groq = new OpenAI({
      apiKey: apiKey,
      baseURL: "https://api.groq.com/openai/v1",
    });

    // List of models to try in order of preference
    const modelsToTry = [
      'llama-3.3-70b-versatile',
      'llama-3.2-90b-vision-preview', 
      'mixtral-8x7b-32768'
    ];

    let lastError;

    // Construct messages for chat completion
    const messages: any[] = [];
    
    if (prompt) {
      messages.push({ role: "system", content: prompt });
    }
    
    if (history && Array.isArray(history)) {
      history.forEach((msg: any) => {
        messages.push({ role: msg.role === 'model' ? 'assistant' : 'user', content: msg.text });
      });
    }

    if (text) {
      messages.push({ role: "user", content: text });
    }

    // Try models sequentially until one works
    for (const modelName of modelsToTry) {
      try {
        const response = await groq.chat.completions.create({
          model: modelName,
          messages: messages,
          temperature: 0.9,
          max_tokens: 8192,
          top_p: 0.95,
          stream: false,
        });

        // If successful, return immediately
        return res.status(200).json({ text: response.choices[0].message.content });
      } catch (error: any) {
        console.error(`Failed with model ${modelName}:`, error.message);
        lastError = error;
        
        // If it's a content blocking error or invalid argument, don't retry other models
        if (error.status === 400 || error.status === 403) {
           break;
        }
      }
    }

    // If all models failed, throw the last error to be caught by the outer catch
    throw lastError;

  } catch (error: any) {
    console.error('All Groq models failed:', error);
    
    return res.status(500).json({ 
      error: 'Failed to process request with Groq',
      details: error.message,
    });
  }
}
