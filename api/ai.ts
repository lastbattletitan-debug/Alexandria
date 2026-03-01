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

    const response = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: messages,
      temperature: 0.7,
      max_tokens: 8192,
      top_p: 0.95,
      stream: false,
    });

    return res.status(200).json({ text: response.choices[0].message.content });

  } catch (error: any) {
    console.error('Groq API error:', error);
    
    return res.status(500).json({ 
      error: 'Failed to process request with Groq',
      details: error.message,
    });
  }
}
