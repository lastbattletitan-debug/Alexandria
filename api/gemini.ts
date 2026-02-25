import { GoogleGenAI } from "@google/genai";
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Try to find the API key in various common environment variables
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.API_KEY;

  // Check if API key is configured
  if (!apiKey) {
    console.error('API Key is missing. Checked: GEMINI_API_KEY, GOOGLE_API_KEY, API_KEY');
    return res.status(500).json({ 
      error: 'Server configuration error: API Key is missing. Please add GEMINI_API_KEY to your environment variables.' 
    });
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { text, prompt } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'Text content is required' });
    }

    // Initialize Gemini client inside the handler
    const ai = new GoogleGenAI({ apiKey: apiKey });

    // List of models to try in order of preference
    // Prioritizing gemini-1.5-flash as requested for large text processing stability
    const modelsToTry = [
      'gemini-1.5-flash',
      'gemini-3-flash-preview',
      'gemini-2.0-flash-exp'
    ];

    let lastError;

    // Construct the prompt
    const fullPrompt = prompt || `Summarize the following text concisely and clearly:\n\n${text}`;

    // Try models sequentially until one works
    for (const modelName of modelsToTry) {
      try {
        console.log(`Attempting to generate content with model: ${modelName}`);
        
        const response = await ai.models.generateContent({
          model: modelName,
          contents: fullPrompt,
        });

        // If successful, return immediately
        return res.status(200).json({ text: response.text });
      } catch (error: any) {
        console.error(`Failed with model ${modelName}:`, error.message);
        lastError = error;
        
        // If it's a content blocking error or invalid argument, don't retry other models
        // as they will likely fail too. Only retry on server errors or model not found.
        if (error.status === 400 || error.status === 403) {
           // Continue to next model only if it might be a model-specific issue
           // Otherwise break? For now, let's try all just in case.
        }
      }
    }

    // If all models failed, throw the last error to be caught by the outer catch
    throw lastError;

  } catch (error: any) {
    console.error('All Gemini models failed:', error);
    
    // Handle specific error cases
    if (error.message?.includes('413')) {
      return res.status(413).json({ error: 'Content too large for processing' });
    }

    return res.status(500).json({ 
      error: 'Failed to process request with Gemini',
      details: error.message,
      modelsTried: ['gemini-3-flash-preview', 'gemini-2.0-flash-exp', 'gemini-1.5-flash']
    });
  }
}
