import { GoogleGenAI } from "@google/genai";
import type { VercelRequest, VercelResponse } from '@vercel/node';

// Initialize Gemini client with environment variable
// This runs on the server, so the key is secure
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { text, prompt } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'Text content is required' });
    }

    // Use the latest flash model for speed and efficiency
    // gemini-3-flash-preview is the recommended model for text tasks
    const modelName = 'gemini-3-flash-preview';

    // Construct the prompt
    const fullPrompt = prompt || `Summarize the following text concisely and clearly:\n\n${text}`;

    // Call Gemini API
    const response = await ai.models.generateContent({
      model: modelName,
      contents: fullPrompt,
    });

    // Return the generated text as JSON
    return res.status(200).json({ text: response.text });

  } catch (error: any) {
    console.error('Gemini API Error:', error);
    
    // Handle specific error cases if needed
    if (error.message?.includes('413')) {
      return res.status(413).json({ error: 'Content too large for processing' });
    }

    return res.status(500).json({ 
      error: 'Failed to process request with Gemini',
      details: error.message 
    });
  }
}
