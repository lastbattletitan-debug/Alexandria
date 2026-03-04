import { GoogleGenAI } from "@google/genai";
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Try to find the API key in various common environment variables
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

  // Check if API key is configured
  if (!apiKey) {
    return res.status(500).json({ 
      error: 'Server configuration error: Gemini API Key is missing. Please add GEMINI_API_KEY to your environment variables.' 
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

    // Initialize Gemini client
    const ai = new GoogleGenAI({ apiKey });

    // Construct contents for chat
    let contents: any[] = [];
    let systemInstruction = prompt || undefined;

    // Map history to Gemini format
    if (history && Array.isArray(history)) {
      history.forEach((msg: any) => {
        const role = msg.role === 'model' ? 'model' : 'user';
        // Gemini expects 'parts' array with 'text'
        contents.push({ role: role, parts: [{ text: msg.text }] });
      });
    }

    // Add the current user message
    if (text) {
      contents.push({ role: "user", parts: [{ text: text }] });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: contents,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.7,
        topP: 0.95,
        maxOutputTokens: 8192,
      },
    });

    return res.status(200).json({ text: response.text });

  } catch (error: any) {
    console.error('Gemini API error:', error);
    
    const statusCode = error.status || 500;
    return res.status(statusCode).json({ 
      error: 'Failed to process request with Gemini',
      details: error.message,
    });
  }
}
